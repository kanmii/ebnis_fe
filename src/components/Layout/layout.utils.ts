import { createContext, Reducer, Dispatch, PropsWithChildren } from "react";
import immer from "immer";
import { RouteComponentProps, WindowLocation, NavigateFn } from "@reach/router";
import { wrapReducer } from "../../logger";
import { ConnectionStatus, isConnected } from "../../state/connections";
import { UserFragment } from "../../graphql/apollo-types/UserFragment";

export enum LayoutActionType {
  SET_UNSAVED_COUNT = "@layout/set-unsaved-count",
  CACHE_PERSISTED = "@layout/render-children",
  EXPERIENCES_TO_PREFETCH = "@layout/experiences-to-pre-fetch",
  CONNECTION_CHANGED = "@layout/connection-changed",
  DONE_FETCHING_EXPERIENCES = "@layout/experiences-already-fetched",
  TOGGLE_SIDEBAR = "@layout/toggle-sidebar",
}

export const reducer: Reducer<StateMachine, LayoutAction> = (state, action) =>
  wrapReducer(state, action, (prevState, { type, ...payload }) => {
    return immer(prevState, proxy => {
      switch (type) {
        case LayoutActionType.CONNECTION_CHANGED:
          {
            const {
              unsavedCount,
              isConnected,
            } = payload as ConnectionChangedPayload;

            const { context, states } = proxy;
            const { user } = context;
            context.hasConnection = isConnected;

            if (!isConnected) {
              context.unsavedCount = 0;
            } else if (user) {
              context.unsavedCount = unsavedCount;
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
          {
            proxy.context.renderChildren = true;

            const { hasConnection, unsavedCount } = payload as {
              unsavedCount: number;
              hasConnection: boolean;
            };

            proxy.context.hasConnection = hasConnection;

            if (!hasConnection) {
              return;
            }

            proxy.context.unsavedCount = unsavedCount;
          }

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
              prefetchExperiences.value = "never-fetched";

              return;
            }

            prefetchExperiences.value = "fetch-now";
            (prefetchExperiences as YesPrefechtExperiences).context = { ids };

            if (!isConnected()) {
              prefetchExperiences.value = "never-fetched";
            }
          }

          break;

        case LayoutActionType.DONE_FETCHING_EXPERIENCES:
          {
            proxy.states.prefetchExperiences.value = "already-fetched";
          }
          break;

        case LayoutActionType.SET_UNSAVED_COUNT:
          {
            proxy.context.unsavedCount = (payload as { count: number }).count;
          }
          break;

        case LayoutActionType.TOGGLE_SIDEBAR:
          {
            const {
              states: { sidebar },
            } = proxy;

            sidebar.value = sidebar.value === "closed" ? "opened" : "closed";
          }

          break;
      }
    });
  });

export function initState(args: {
  connectionStatus: ConnectionStatus;
  user: UserFragment | null;
}): StateMachine {
  const {
    connectionStatus: { isConnected },
    user,
  } = args;

  return {
    context: {
      unsavedCount: null,
      renderChildren: false,
      hasConnection: !!isConnected,
      user,
    },
    states: {
      prefetchExperiences: {
        value: "never-fetched",
      },

      sidebar: {
        value: "closed",
      },
    },
  };
}

export const LayoutContextHeader = createContext<ILayoutContextHeaderValue>({
  unsavedCount: 0,
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

export type LayoutAction =
  | {
      type: LayoutActionType.SET_UNSAVED_COUNT;
      count: number;
    }
  | {
      type: LayoutActionType.CACHE_PERSISTED;
      unsavedCount: number | null;
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
      type: LayoutActionType.TOGGLE_SIDEBAR;
    };

interface ConnectionChangedPayload {
  isConnected: boolean;
  unsavedCount: number;
}

export interface StateMachine {
  context: {
    hasConnection: boolean;
    unsavedCount: number | null;
    renderChildren: boolean;
    user: UserFragment | null;
  };

  states: {
    prefetchExperiences: IPrefetchExperiencesState;
    sidebar: {
      value: "opened" | "closed";
    };
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
  unsavedCount: number;
  hasConnection: boolean;
  sidebarVisible: boolean;
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
