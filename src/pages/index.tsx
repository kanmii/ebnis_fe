import React from "react";
import { RouteComponentProps } from "@reach/router";
import { Helmet } from "react-helmet-async";
import { Login } from "../components/Login/login.component";
import { Layout } from "../components/Layout/layout.component";
import { SITE_TITLE } from "../constants";

export default function IndexPage(props: RouteComponentProps) {
  return (
    <Layout {...props}>
      <Helmet>
        <title>{SITE_TITLE}</title>
      </Helmet>

      <Login />
    </Layout>
  );
}
