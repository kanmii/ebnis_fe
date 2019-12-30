import { createContext, Reducer, Dispatch, PropsWithChildren } from "react";
import immer from "immer";
import { RouteComponentProps, WindowLocation, NavigateFn } from "@reach/router";
import { wrapReducer } from "../../logger";
import { ConnectionStatus, isConnected } from "../../state/connections";
import { UserFragment } from "../../graphql/apollo-types/UserFragment";
// import { InMemoryCache } from "apollo-cache-inmemory";
import { getOfflineItemsCount } from "../../state/offline-resolvers";

export enum LayoutActionType {
  SET_OFFLINE_ITEMS_COUNT = "@layout/set-offline-items-count",
  CACHE_PERSISTED = "@layout/render-children",
  EXPERIENCES_TO_PREFETCH = "@layout/experiences-to-pre-fetch",
  CONNECTION_CHANGED = "@layout/connection-changed",
  DONE_FETCHING_EXPERIENCES = "@layout/experiences-already-fetched",
  REFETCH_OFFLINE_ITEMS_COUNT = "@layout/refetch-offline-items-count",
  PUT_EFFECT_FUNCTIONS_ARGS = "@layout/put-effects-functions-args",
}

export const StateValue = {
  effectValNoEffect: "noEffect" as EffectValueNoEffect,
  effectValHasEffects: "hasEffects" as EffectValueHasEffects,
  prefetchValNeverFetched: "never-fetched" as PrefetchValNeverFetched,
  prefetchValFetchNow: "fetch-now" as PrefetchValFetchNow,
};

type PrefetchValFetchNow = "fetch-now";

export interface InitStateArgs {
  connectionStatus: ConnectionStatus;
  user: UserFragment | null;
}

export function initState(args: InitStateArgs): StateMachine {
  const {
    connectionStatus: { isConnected },
    user,
  } = args;

  return {
    context: {
      offlineItemsCount: null,
      renderChildren: false,
      hasConnection: !!isConnected,
      user,
    },
    states: {
      prefetchExperiences: {
        value: StateValue.prefetchValNeverFetched,
      },
    },

    effects: {
      value: StateValue.effectValNoEffect,
      context: {
        metaFunctions: {} as EffectFunctionsArgs,
      },
    },
  };
}

export const reducer: Reducer<StateMachine, LayoutAction> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, proxy => {
      proxy.effects.value = StateValue.effectValNoEffect;

      switch (type) {
        case LayoutActionType.CONNECTION_CHANGED:
          {
            const {
              offlineItemsCount,
              isConnected,
            } = payload as ConnectionChangedPayload;

            const { context, states } = proxy;
            const { user } = context;
            context.hasConnection = isConnected;

            if (!isConnected) {
              context.offlineItemsCount = 0;
            } else if (user) {
              context.offlineItemsCount = offlineItemsCount;
            }

            if (!user) {
              return;
            }

            const yesPrefetch = states.prefetchExperiences as YesPrefechtExperiences;

            if (
              isConnected &&
              states.prefetchExperiences.value === "never-fetched"
            ) {
              if (yesPrefetch.context) {
                yesPrefetch.value = "fetch-now";
              }
            }
          }

          break;

        case LayoutActionType.CACHE_PERSISTED:
          handleCachePersistedAction(proxy, payload as CachePersistedPayload);
          break;

        case LayoutActionType.EXPERIENCES_TO_PREFETCH:
          {
            const {
              states: { prefetchExperiences },
              context: { user },
            } = proxy;

            const ids = (payload as {
              ids: string[] | null;
            }).ids;

            if (!user || !ids || ids.length === 0) {
              prefetchExperiences.value = StateValue.prefetchValNeverFetched;

              return;
            }

            prefetchExperiences.value = "fetch-now";
            (prefetchExperiences as YesPrefechtExperiences).context = { ids };

            if (!isConnected()) {
              prefetchExperiences.value = StateValue.prefetchValNeverFetched;
            }
          }

          break;

        case LayoutActionType.DONE_FETCHING_EXPERIENCES:
          {
            proxy.states.prefetchExperiences.value = "already-fetched";
          }
          break;

        case LayoutActionType.SET_OFFLINE_ITEMS_COUNT:
          {
            proxy.context.offlineItemsCount = (payload as {
              count: number;
            }).count;
          }
          break;

        case LayoutActionType.REFETCH_OFFLINE_ITEMS_COUNT:
          handleGetOfflineItemsCountAction(proxy);
          break;

        case LayoutActionType.PUT_EFFECT_FUNCTIONS_ARGS:
          proxy.effects.context.metaFunctions = payload as EffectFunctionsArgs;
          break;
      }
    });
  });

////////////////////////// EFFECT FUNCTIONS ////////////////////////////

const getOfflineItemsCountEffect: GetOfflineItemsCountEffect["func"] = ({
  cache,
  dispatch,
}) => {
  dispatch({
    type: LayoutActionType.SET_OFFLINE_ITEMS_COUNT,
    count: getOfflineItemsCount(cache),
  });
};

type GetOfflineItemsCountEffect = LayoutEffectDefinition<
  "getOfflineItemsCount",
  "cache" | "dispatch"
>;

export const effectFunctions = {
  getOfflineItemsCount: getOfflineItemsCountEffect,
};

////////////////////////// END EFFECT FUNCTIONS ////////////////////////

////////////////////////// STATE UPDATE FUNCTIONS /////////////////

function handleGetOfflineItemsCountAction(globalState: StateMachine) {
  const effectObjects = prepareToAddEffect(globalState);
  effectObjects.push({
    key: "getOfflineItemsCount",
    effectArgKeys: ["cache", "dispatch"],
    ownArgs: {},
  });
}

function handleCachePersistedAction(
  globalState: StateMachine,
  payload: CachePersistedPayload,
) {
  globalState.context.renderChildren = true;

  const { hasConnection, offlineItemsCount } = payload;

  globalState.context.hasConnection = hasConnection;

  if (!hasConnection) {
    return;
  }

  globalState.context.offlineItemsCount = offlineItemsCount;
}

function prepareToAddEffect(globalState: StateMachine) {
  const effects = (globalState.effects as unknown) as EffectState;
  effects.value = StateValue.effectValHasEffects;
  const effectObjects: EffectObject = [];
  effects.hasEffects = {
    context: {
      effects: effectObjects,
    },
  };

  return effectObjects;
}
////////////////////////// END STATE UPDATE FUNCTIONS /////////////////

export const LayoutContextHeader = createContext<ILayoutContextHeaderValue>({
  offlineItemsCount: 0,
} as ILayoutContextHeaderValue);

export const LayoutUnchangingContext = createContext<
  ILayoutUnchangingContextValue
>({} as ILayoutUnchangingContextValue);

export const LayoutContextExperience = createContext<
  ILayoutContextExperienceValue
>({} as ILayoutContextExperienceValue);

export const LocationContext = createContext<ILocationContextValue>(
  {} as ILocationContextValue,
);

////////////////////////// TYPES ////////////////////////////

type PrefetchValNeverFetched = "never-fetched";

export type LayoutAction =
  | {
      type: LayoutActionType.SET_OFFLINE_ITEMS_COUNT;
      count: number;
    }
  | {
      type: LayoutActionType.CACHE_PERSISTED;
      offlineItemsCount: number | null;
      hasConnection: boolean;
    }
  | {
      type: LayoutActionType.EXPERIENCES_TO_PREFETCH;
      ids: string[] | null;
    }
  | {
      type: LayoutActionType.CONNECTION_CHANGED;
    } & ConnectionChangedPayload
  | {
      type: LayoutActionType.DONE_FETCHING_EXPERIENCES;
    }
  | {
      type: LayoutActionType.REFETCH_OFFLINE_ITEMS_COUNT;
    }
  | {
      type: LayoutActionType.PUT_EFFECT_FUNCTIONS_ARGS;
    } & EffectFunctionsArgs;

interface ConnectionChangedPayload {
  isConnected: boolean;
  offlineItemsCount: number;
}

interface CachePersistedPayload {
  offlineItemsCount: number;
  hasConnection: boolean;
}

export interface StateMachine {
  context: {
    hasConnection: boolean;
    offlineItemsCount: number | null;
    renderChildren: boolean;
    user: UserFragment | null;
  };

  states: {
    prefetchExperiences: IPrefetchExperiencesState;
  };

  readonly effects: (EffectState | { value: EffectValueNoEffect }) & {
    context: EffectContext;
  };
}

type IPrefetchExperiencesState =
  | {
      value: "never-fetched";
    }
  | {
      value: "already-fetched";
    }
  | YesPrefechtExperiences;

interface YesPrefechtExperiences {
  value: "fetch-now";
  context: {
    ids: string[];
  };
}

export type LayoutDispatchType = Dispatch<LayoutAction>;

export interface Props extends PropsWithChildren<{}>, RouteComponentProps {}

export interface ILayoutContextHeaderValue {
  offlineItemsCount: number;
  hasConnection: boolean;
}

export interface ILayoutUnchangingContextValue {
  layoutDispatch: LayoutDispatchType;
}

export interface ILayoutContextExperienceValue {
  fetchExperience: IPrefetchExperiencesState["value"];
}

interface ILocationContextValue extends WindowLocation {
  navigate: NavigateFn;
}

type EffectValueNoEffect = "noEffect";
type EffectValueHasEffects = "hasEffects";

interface EffectContext {
  metaFunctions: EffectFunctionsArgs;
}

type EffectObject = GetOfflineItemsCountEffect[];

interface EffectState {
  value: EffectValueHasEffects;
  hasEffects: {
    context: {
      effects: EffectObject;
    };
  };
}

export interface EffectFunctionsArgs {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
  cache: any; // InMemoryCache;
  dispatch: LayoutDispatchType;
}

interface LayoutEffectDefinition<
  Key extends keyof typeof effectFunctions,
  EffectArgKeys extends keyof EffectFunctionsArgs,
  OwnArgs = {}
> {
  key: Key;
  effectArgKeys: EffectArgKeys[];
  ownArgs: OwnArgs;
  func?: (
    effectArgs: { [k in EffectArgKeys]: EffectFunctionsArgs[k] },
    ownArgs: OwnArgs,
  ) => void | Promise<void>;
}
