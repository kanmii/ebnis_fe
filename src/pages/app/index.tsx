import React from "react";
import { Router, RouteComponentProps } from "@reach/router";

import { AuthRequired } from "../../components/AuthRequired";
import { ExperienceDefinition } from "../../components/ExperienceDefinition";
import { NewEntry } from "../../components/NewEntry";
import {
  EXPERIENCE_DEFINITION_URL,
  NEW_ENTRY_URL,
  EXPERIENCES_URL,
  EXPERIENCE_URL
} from "../../routes";
import { NotFound } from "../../components/NotFound";
import { SidebarHeader } from "../../components/SidebarHeader";
import { Experiences } from "../../components/Experiences";
import { Experience } from "../../components/Experience";
import { Layout } from "../../components/Layout";

export function App(props: RouteComponentProps) {
  return (
    <Layout>
      <Router style={{ height: "100%" }}>
        <AuthRequired
          path={EXPERIENCE_DEFINITION_URL}
          component={ExperienceDefinition}
          SidebarHeader={SidebarHeader}
        />

        <AuthRequired
          path={EXPERIENCE_URL}
          component={Experience}
          SidebarHeader={SidebarHeader}
        />

        <AuthRequired
          path={NEW_ENTRY_URL}
          component={NewEntry}
          SidebarHeader={SidebarHeader}
        />

        <AuthRequired
          path={EXPERIENCES_URL}
          component={Experiences}
          SidebarHeader={SidebarHeader}
        />

        <NotFound default={true} />
      </Router>
    </Layout>
  );
}

export default App;