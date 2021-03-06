import { RouteComponentProps, NavigateFn } from "@reach/router";
import {
  ExperienceConnectionFragment_edges_node,
  ExperienceConnectionFragment,
  ExperienceConnectionFragment_edges,
} from "../../graphql/apollo-types/ExperienceConnectionFragment";
import { ApolloError, WatchQueryFetchPolicy } from "apollo-client";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import fuzzysort from "fuzzysort";
import { Reducer, Dispatch } from "react";
import { wrapReducer } from "../../logger";
import immer, { Draft } from "immer";
import { getDeletedExperienceTitle } from "../../apollo-cache/should-delete-experience";

export const StateValue = {
  inactive: "inactive" as InActiveVal,
  active: "active" as ActiveVal,
  searching: "searching" as SearchingVal,
  results: "results" as ResultsVal,
};

export enum ActionType {
  SET_SEARCH_TEXT = "@my-experiences/set-search-text",
  TOGGLE_DESCRIPTION = "@my-experiences/toggle-description",
  SEARCH = "@my-experiences/search",
  ON_EXPERIENCES_CHANGED = "@my-experiences/on-experiences-changed",
  CLEAR_SEARCH = "@my-experiences/clear-search",
  DISMISS_EXPERIENCE_DELETED_NOTIFICATION = "@my-experiences/dismiss-experience-deleted-notification",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, proxy => {
        switch (type) {
          case ActionType.SET_SEARCH_TEXT:
            handleSetSearchTextAction(proxy, payload as SetSearchTextPayload);
            break;

          case ActionType.SEARCH:
            handleSearchAction(proxy, payload as SetSearchTextPayload);
            break;

          case ActionType.ON_EXPERIENCES_CHANGED:
            handleOnExperiencesChangedAction(
              proxy,
              payload as ExperiencesChangedPayload,
            );
            break;

          case ActionType.TOGGLE_DESCRIPTION:
            handleToggleDescriptionAction(
              proxy,
              payload as ToggleDescriptionPayload,
            );
            break;

          case ActionType.CLEAR_SEARCH:
            handleClearSearch(proxy);
            break;

          case ActionType.DISMISS_EXPERIENCE_DELETED_NOTIFICATION:
            proxy.states.experienceDeleted.value = StateValue.inactive;
            break;
        }
      });
    },

    // true,
  );

////////////////////////// STATE UPDATE SECTION /////////////

export function initState(experiences: ExperienceFragment[]): StateMachine {
  const deletedExperienceTitle = getDeletedExperienceTitle();

  return {
    context: {
      idToShowingDescriptionMap: makeIdToShowingDescriptionMap(experiences),
      experiencesPrepared: prepareExperiencesForSearch(experiences),
    },
    states: {
      search: {
        value: StateValue.inactive,
        searchText: "",
      },
      experienceDeleted: deletedExperienceTitle
        ? {
            value: StateValue.active,
            active: {
              context: {
                title: deletedExperienceTitle,
              },
            },
          }
        : {
            value: StateValue.inactive,
          },
    },
  };
}

function makeIdToShowingDescriptionMap(experiences: ExperienceFragment[]) {
  return experiences.reduce((acc, experience) => {
    const { description, id } = experience;

    if (description) {
      acc[id] = false;
    }

    return acc;
  }, {} as DescriptionMap);
}

function handleSetSearchTextAction(
  proxy: DraftState,
  { text }: SetSearchTextPayload,
) {
  const { states } = proxy;
  const search = states.search as SearchState;
  search.value = StateValue.searching;
  search.searchText = text;
}

function handleSearchAction(proxy: DraftState, { text }: SetSearchTextPayload) {
  const {
    states,
    context: { experiencesPrepared },
  } = proxy;
  const search = states.search as SearchResults;
  search.value = StateValue.results;

  const results = fuzzysort
    .go(text, experiencesPrepared, {
      key: "title",
    })
    .map(searchResult => {
      const { obj } = searchResult;

      return {
        title: obj.title,
        id: obj.id,
      };
    });

  search.results = search.results || { context: { results } };
  search.results.context.results = results;
}

function handleOnExperiencesChangedAction(
  proxy: DraftState,
  { experiences }: ExperiencesChangedPayload,
) {
  const { context } = proxy;

  context.idToShowingDescriptionMap = makeIdToShowingDescriptionMap(
    experiences,
  );

  context.experiencesPrepared = prepareExperiencesForSearch(experiences);
}

function handleToggleDescriptionAction(
  proxy: DraftState,
  { id }: ToggleDescriptionPayload,
) {
  const {
    context: { idToShowingDescriptionMap },
    states: { search },
  } = proxy;

  idToShowingDescriptionMap[id] = !idToShowingDescriptionMap[id];
  search.value = StateValue.inactive;
}

function handleClearSearch(proxy: DraftState) {
  const {
    states: { search },
  } = proxy;

  search.value = StateValue.inactive;
  search.searchText = "";
}

////////////////////////// END STATE UPDATE SECTION /////////////

function prepareExperiencesForSearch(experiences: ExperienceFragment[]) {
  return experiences.map(({ id, title }) => {
    return {
      id,
      title,
      target: fuzzysort.prepare(title) as Fuzzysort.Prepared,
    };
  });
}

// istanbul ignore next:
export function getExperiencesNodes(
  experienceConnection?: ExperienceConnectionFragment | null,
) {
  if (!experienceConnection) {
    return [];
  }

  return (experienceConnection.edges as ExperienceConnectionFragment_edges[]).map(
    edge => edge.node as ExperienceConnectionFragment_edges_node,
  );
}

export function computeFetchPolicy(
  hasConnection: boolean,
): WatchQueryFetchPolicy {
  return hasConnection ? "cache-first" : "cache-only";
}

////////////////////////// STRINGY TYPES SECTION //////////////////////

type InActiveVal = "inactive";
type ActiveVal = "active";
type SearchingVal = "searching";
type ResultsVal = "results";

////////////////////////// END STRINGY TYPES SECTION /////////////////

////////////////////////// TYPES SECTION ////////////////////////////

type DraftState = Draft<StateMachine>;

export interface StateMachine {
  readonly context: {
    idToShowingDescriptionMap: DescriptionMap;
    experiencesPrepared: ExperiencesSearchPrepared;
  };
  readonly states: {
    readonly search: SearchState;
    readonly experienceDeleted:
      | ExperienceDeletedActive
      | { value: InActiveVal };
  };
}

interface ExperienceDeletedActive {
  readonly value: ActiveVal;
  readonly active: {
    readonly context: {
      readonly title: string;
    };
  };
}

interface FormInput {
  field1: string;
}

export type SearchState = {
  searchText: string;
} & (
  | {
      value: "inactive";
    }
  | {
      value: "searching";
    }
  | SearchResults
);

export interface SearchResults {
  value: "results";

  results: {
    context: {
      results: MySearchResult[];
    };
  };
}

interface MySearchResult {
  title: string;
  id: string;
}

export type ExperiencesSearchPrepared = {
  target: Fuzzysort.Prepared;
  title: string;
  id: string;
}[];

type Action =
  | {
      type: ActionType.DISMISS_EXPERIENCE_DELETED_NOTIFICATION;
    }
  | ({
      type: ActionType.TOGGLE_DESCRIPTION;
    } & ToggleDescriptionPayload)
  | ({
      type: ActionType.SET_SEARCH_TEXT;
    } & SetSearchTextPayload)
  | ({
      type: ActionType.SEARCH;
    } & SetSearchTextPayload)
  | ({
      type: ActionType.ON_EXPERIENCES_CHANGED;
    } & ExperiencesChangedPayload)
  | {
      type: ActionType.CLEAR_SEARCH;
    };

interface ExperiencesChangedPayload {
  experiences: ExperienceFragment[];
}

interface ToggleDescriptionPayload {
  id: string;
}

interface SetSearchTextPayload {
  text: string;
}

export interface Props {
  navigate: NavigateFn;
  experiences: ExperienceConnectionFragment_edges_node[];
  loading: boolean;
  error?: ApolloError;
  hasConnection: boolean;
}

export type CallerProps = RouteComponentProps<{}>;

export interface DescriptionMap {
  [k: string]: boolean;
}

export interface ExperienceProps {
  showingDescription: boolean;
  experience: ExperienceConnectionFragment_edges_node;
  navigate: NavigateFn;
  dispatch: DispatchType;
}

export interface NoneStateContextValue {
  navigate: NavigateFn;
}

export type SearchComponentProps = {
  dispatch: DispatchType;
  experiencesLen: number;
  searchState: StateMachine["states"]["search"];
};

export type DispatchType = Dispatch<Action>;
