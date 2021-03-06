/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { ComponentType } from "react";
import "@marko/testing-library/cleanup-after-each";
import {
  render,
  fireEvent,
  wait,
  waitForElement,
} from "@testing-library/react";
import { SignUp } from "../components/Signup/signup.component";
import { Props } from "../components/Signup/signup.utils";
import { renderWithRouter, fillField } from "./test_utils";
import { isConnected } from "../state/connections";
import { refreshToHome } from "../refresh-to-app";
import { ApolloError } from "apollo-client";
import { GraphQLError } from "graphql";
import { storeUser } from "../state/users";
import { useMutation } from "@apollo/react-hooks";
import { scrollIntoView } from "../components/scroll-into-view";
import { makeFormFieldSelectorClass } from "../components/Signup/signup.dom";

jest.mock("../state/connections");
jest.mock("../refresh-to-app");
jest.mock("../state/users");
jest.mock("@apollo/react-hooks");
jest.mock("../components/scroll-into-view");

jest.mock("../components/SidebarHeader/sidebar-header.component", () => ({
  SidebarHeader: jest.fn(() => null),
}));

const mockIsConnected = isConnected as jest.Mock;
const mockRefreshToHome = refreshToHome as jest.Mock;
const mockStoreUser = storeUser as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockScrollIntoView = scrollIntoView as jest.Mock;

beforeEach(() => {
  mockIsConnected.mockReset();
  mockRefreshToHome.mockReset();
  mockStoreUser.mockReset();
  mockUseMutation.mockReset();
  mockScrollIntoView.mockReset();
});

it("renders correctly and submits", async () => {
  const user = {};

  const { ui, mockRegisterUser } = makeComp();

  mockRegisterUser.mockResolvedValue({
    data: {
      registration: user,
    },
  });

  /**
   * Given we are using the signup component
   */
  render(ui);

  /**
   * Then the submit button should be disabled
   */
  const $button = document.getElementById(
    "sign-up-submit",
  ) as HTMLButtonElement;

  expect($button.disabled).toBe(true);

  /**
   * And source field should be readonly
   */
  const sourceField = document.getElementById(
    "sign-up-source",
  ) as HTMLInputElement;
  expect(sourceField.readOnly).toBe(true);

  const sourceFieldParent = document.getElementsByClassName(
    makeFormFieldSelectorClass("source"),
  )[0] as HTMLDivElement;

  expect(sourceFieldParent.classList).toContain("disabled");

  /**
   * When we complete the form
   */
  fillField(document.getElementById("sign-up-name") as any, "Kanmii");

  fillField(document.getElementById("sign-up-email") as any, "me@me.com");

  fillField(document.getElementById("sign-up-password") as any, "awesome pass");

  fillField(
    document.getElementById("sign-up-passwordConfirmation") as any,
    "awesome pass",
  );

  /**
   * Then the submit button should be enabled
   */
  expect($button.disabled).toBe(false);

  /**
   * When we submit the form
   */
  fireEvent.click($button);

  /**
   * Then correct data should be sent to the server
   */
  await wait(
    () =>
      expect(mockRegisterUser).toHaveBeenCalledWith({
        variables: {
          registration: {
            name: "Kanmii",
            email: "me@me.com",
            password: "awesome pass",
            passwordConfirmation: "awesome pass",
            source: "password",
          },
        },
      }),
    { interval: 1 },
  );

  /**
   * And data received from server should be saved locally on the client
   */
  expect(mockStoreUser).toHaveBeenCalledWith(user);

  /**
   * And we should be redirected
   */
  expect(mockRefreshToHome).toBeCalled();
});

it("renders error if socket not connected", async () => {
  /**
   * Given that we are not connected to the server
   */
  const { ui } = makeComp(false);

  /**
   * And we are using the signup component
   */
  render(ui);

  /**
   * Then we should not see any error UI
   */
  expect(document.getElementById("other-errors")).toBeNull();

  /**
   * When we complete and submit the form
   */
  fillForm();

  /**
   * Then we should see error UI
   */
  const errorDom = await waitForElement(() =>
    document.getElementById("other-errors"),
  );

  expect(errorDom).not.toBeNull();

  /**
   * And page should be automatically scrolled to the top of page
   */
  expect(mockScrollIntoView).toBeCalled();
});

it("renders error if password and password confirm are not same", async () => {
  const { ui } = makeComp();

  /**
   * Given we are using signup component
   */
  render(ui);

  /**
   * Then we should not see any error UI
   */

  expect(
    document.getElementById("sign-up-passwordConfirmation-error"),
  ).toBeNull();

  const $passwordConfirm = document.getElementById(
    "sign-up-passwordConfirmation",
  ) as HTMLInputElement;

  const passwordConfirmParentField = document.getElementsByClassName(
    makeFormFieldSelectorClass("passwordConfirmation"),
  )[0] as HTMLElement;

  expect(passwordConfirmParentField.classList).not.toContain("error");

  /**
   * When complete the form, but the password and password confirm fields
   * do not match
   */
  fillField(document.getElementById("sign-up-name") as any, "Kanmii");

  fillField(document.getElementById("sign-up-email") as any, "me@me.com");

  fillField(document.getElementById("sign-up-password") as any, "awesome pass");

  fillField($passwordConfirm, "awesome pass1");

  /**
   * And we submit the form
   */
  fireEvent.click(
    document.getElementById("sign-up-submit") as HTMLButtonElement,
  );

  /**
   * Then we should see error UI
   */
  const $error = await waitForElement(() =>
    document.getElementById("sign-up-passwordConfirmation-error"),
  );

  expect($error).not.toBeNull();

  expect(passwordConfirmParentField.classList).toContain("error");

  /**
   * And the page should be automatically scrolled up
   */
  expect(mockScrollIntoView).toBeCalled();
});

it("renders errors if server returns network errors", async () => {
  const { ui, mockRegisterUser } = makeComp();

  /**
   * Given that our server will return network error on form submission
   */
  mockRegisterUser.mockRejectedValue(
    new ApolloError({
      networkError: new Error("network error"),
    }),
  );

  /**
   * When we start using the component
   */
  render(ui);

  /**
   * Then we should not see any error UI
   */
  expect(document.getElementById("network-error")).toBeNull();

  /**
   * When we complete and submit the form
   */
  fillForm();

  /**
   * Then we should see error UI
   */
  const errorDom = await waitForElement(() =>
    document.getElementById("network-error"),
  );

  expect(errorDom).not.toBeNull();

  /**
   * And we should be automatically scrolled to top
   */
  expect(mockScrollIntoView).toBeCalled();
});

it("renders errors if server returns field errors", async () => {
  const { ui, mockRegisterUser } = makeComp();

  /**
   * Given that our server will return field errors on form submission
   */
  mockRegisterUser.mockRejectedValue(
    new ApolloError({
      graphQLErrors: [
        new GraphQLError(`{"errors":{"email":"has already been taken"}}`),
      ],
    }),
  );

  /**
   * When we start using the component
   */
  render(ui);

  /**
   * Then we should not see error summary UI
   */
  expect(document.getElementById("sign-up-server-field-error")).toBeNull();

  /**
   * And we should not see field error
   */
  expect(document.getElementById("error-text-0")).toBeNull();

  const emailParentField = document.getElementsByClassName(
    makeFormFieldSelectorClass("email"),
  )[0] as HTMLElement;

  expect(emailParentField.classList).not.toContain("error");

  /**
   * When we complete and submit the form
   */
  fillForm();

  /**
   * Then we should see error summary
   */
  const $error = await waitForElement(
    () => document.getElementById("sign-up-server-field-error") as HTMLElement,
  );
  expect($error).not.toBeNull();

  /**
   * And we should see field error
   */
  expect(document.getElementById("error-text-0")).not.toBeNull();

  /**
   * And field error should visually indicate so
   */
  expect(emailParentField.classList).toContain("error");

  /**
   * And we should be automatically scrolled to top
   */
  expect(mockScrollIntoView).toBeCalled();

  /**
   * When we click on close button of error UI
   */
  fireEvent.click($error.querySelector(`[class="close icon"]`) as any);

  /**
   * Then error summary should no longer bee visible
   */
  expect(document.getElementById("sign-up-server-field-error")).toBeNull();

  /**
   * But field error should still be visible
   */
  expect(document.getElementById("sign-up-email-error")).not.toBeNull();
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

function fillForm() {
  fillField(document.getElementById("sign-up-name") as any, "Kanmii");
  fillField(document.getElementById("sign-up-email") as any, "me@me.com");
  fillField(document.getElementById("sign-up-password") as any, "awesome pass");

  fillField(
    document.getElementById("sign-up-passwordConfirmation") as any,
    "awesome pass",
  );

  fireEvent.click(
    document.getElementById("sign-up-submit") as HTMLButtonElement,
  );
}

const SignUpP = SignUp as ComponentType<Partial<Props>>;

function makeComp(isServerConnected = true) {
  mockIsConnected.mockReturnValue(isServerConnected);
  const { Ui, ...rest } = renderWithRouter(SignUpP);

  const mockRegisterUser = jest.fn();
  mockUseMutation.mockReturnValue([mockRegisterUser]);

  return {
    ui: <Ui />,
    mockRegisterUser,
    ...rest,
  };
}
