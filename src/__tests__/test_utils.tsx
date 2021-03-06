/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { fireEvent } from "@testing-library/react";
import { RouteComponentProps, WindowLocation } from "@reach/router";

export function renderWithRouter<TProps extends RouteComponentProps>(
  Ui: ComponentType<TProps>,
  routerProps: Partial<RouteComponentProps> = {},
  componentProps: Partial<TProps> = {},
) {
  const {
    navigate = jest.fn(),
    path = "/",
    location: userLocation = {},
    ...rest
  } = routerProps;
  const location = { pathname: path, ...userLocation } as WindowLocation;

  return {
    mockNavigate: navigate,
    ...rest,
    location,
    Ui: (props: TProps) => {
      return (
        <Ui
          navigate={navigate}
          location={location}
          {...rest}
          {...componentProps}
          {...props}
        />
      );
    },
  };
}

export function createLocation(
  locationProps: WindowLocation = {} as WindowLocation,
) {
  const navigate = jest.fn();
  return {
    mockNavigate: navigate,
    pathname: "/",
    navigate,
    ...locationProps,
  };
}

export function fillField(element: Element, value: string) {
  fireEvent.change(element, {
    target: { value },
  });
}

export function makeTestCache() {
  const mockWriteFragment = jest.fn();
  const mockReadQuery = jest.fn();
  const mockWriteQuery = jest.fn();

  const cache = {
    writeFragment: mockWriteFragment,
    readQuery: mockReadQuery,
    writeQuery: mockWriteQuery,
  };

  return {
    cache,
    mockReadQuery,
  };
}

export function makeEntryNode(id = "1") {
  return {
    id,

    dataObjects: [
      {
        definitionId: "f1",
        data: `{"decimal":1}`,
      },
    ],
  };
}

export function makeDataDefinitions() {
  return [{ id: "f1", type: "DECIMAL" as any, name: "f1" }];
}

export function closeMessage($element: any) {
  const $icon =
    $element && $element.querySelector && $element.querySelector(`.close.icon`);

  if (!$icon) {
    return;
  }

  $icon.click();
}

export interface ToVariables<T> {
  variables: T;
  update: jest.Mock;
}

export interface ToData<T> {
  data: T;
}

export interface ToInputVariables<T> {
  variables: {
    input: T;
  };

  update: jest.Mock;
}

/**

import { Props as DateTimeProps } from "../components/DateTimeField/date-time-field.utils";
import { toISODatetimeString } from "../components/NewEntry/new-entry.utils";
export function MockDateTimeField(props: DateTimeProps) {
  const { value, name, onChange } = props;

  const comp = (
    <input
      value={toISODatetimeString(value as Date)}
      id={name}
      onChange={evt => {
        const val = evt.currentTarget.value;
        const date = new Date(val);
        onChange(name, isNaN(date.getTime()) ? "invalid" : date);
      }}
    />
  );

  return comp;
}
   */
