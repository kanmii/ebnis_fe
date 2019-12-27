import {
  LocalResolverFn,
  MUTATION_NAME_createExperienceOffline,
} from "../../state/resolvers";
import { CreateExperienceMutationVariables } from "../../graphql/apollo-types/CreateExperienceMutation";
import { CreateDataDefinition } from "../../graphql/apollo-types/globalTypes";
import { makeOfflineId } from "../../constants";
import gql from "graphql-tag";
import {
  ExperienceFragment_dataDefinitions,
  ExperienceFragment,
} from "../../graphql/apollo-types/ExperienceFragment";
import { EXPERIENCE_FRAGMENT } from "../../graphql/experience.fragment";
import { writeGetExperienceFullQueryToCache } from "../../state/resolvers/write-get-experience-full-query-to-cache";
import { insertExperienceInGetExperiencesMiniQuery } from "../../state/resolvers/update-get-experiences-mini-query";
import { updateCacheExperienceOfflineEntriesCount } from "../../state/resolvers/update-experiences-in-cache";

const createOfflineExperienceResolver: LocalResolverFn<
  CreateExperienceMutationVariables,
  ExperienceFragment
> = (
  _,
  {
    createExperienceInput: {
      description = null,
      title,
      dataDefinitions: createDataDefinitions,
    },
  },
  { cache, client },
) => {
  const today = new Date();
  const timestamp = today.toJSON();
  const experienceId = makeOfflineId(today.getTime());

  const dataDefinitions: ExperienceFragment_dataDefinitions[] = (createDataDefinitions as CreateDataDefinition[]).map(
    ({ name, type }, index) => {
      const id = experienceId + "--" + index;

      return {
        __typename: "DataDefinition",
        name,
        type,
        id,
        clientId: id,
      };
    },
  );

  const experience: ExperienceFragment = {
    hasUnsaved: true,
    __typename: "Experience",
    id: experienceId,
    clientId: experienceId,
    insertedAt: timestamp,
    updatedAt: timestamp,
    description,
    title,
    dataDefinitions,
    entries: {
      __typename: "EntryConnection",
      edges: [],
      pageInfo: {
        __typename: "PageInfo",
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  };

  writeGetExperienceFullQueryToCache(cache, experience, {
    writeFragment: false,
  });

  insertExperienceInGetExperiencesMiniQuery(client, experience, {
    force: true,
  });

  updateCacheExperienceOfflineEntriesCount(client, experienceId);

  return experience;
};

export const CREATE_OFFLINE_EXPERIENCE_MUTATION = gql`
  mutation CreateOfflineExperienceMutation(
    $createExperienceInput: CreateExperienceInput!
  ) {
    createOfflineExperience(createExperienceInput: $createExperienceInput)
      @client {
      ...ExperienceFragment
    }
  }

  ${EXPERIENCE_FRAGMENT}
`;

export interface CreateOfflineExperienceMutationData {
  createOfflineExperience: ExperienceFragment;
}

//////////////////////////// QUERIES /////////////////////////////////

//////////////////////////// END QUERIES ////////////////////////////

export const experienceDefinitionResolvers = {
  Mutation: {
    [MUTATION_NAME_createExperienceOffline]: createOfflineExperienceResolver,
  },

  Query: {},
};