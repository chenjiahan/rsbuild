import path from 'path';
import { fs } from '@rsbuild/shared/fs-extra';
import { getMonorepoBaseData, getMonorepoSubProjects } from '../common';
import type { Project } from '../project/project';
import type { MonorepoAnalyzer } from '../types';
import { readPackageJson } from '../utils';
import { defaultFilter, type Filter } from './filter';

export type ExtraMonorepoStrategies = Record<string, MonorepoAnalyzer>;

export interface GetDependentProjectsOptions {
  // Find the start of the monorepo root path
  cwd?: string;
  recursive?: boolean;
  filter?: Filter;
  extraMonorepoStrategies?: ExtraMonorepoStrategies;
}

const filterProjects = async (projects: Project[], filter?: Filter) => {
  if (!filter) {
    return defaultFilter(projects);
  }

  return filter(projects);
};

const getDependentProjects = async (
  projectNameOrRootPath: string,
  options: GetDependentProjectsOptions,
) => {
  const {
    cwd = process.cwd(),
    recursive,
    filter,
    extraMonorepoStrategies,
  } = options;

  // check if first argument is projectRootPath.
  const currentProjectPkgJsonPath = path.join(
    projectNameOrRootPath,
    'package.json',
  );

  let projectName: string;
  if (await fs.pathExists(currentProjectPkgJsonPath)) {
    ({ name: projectName } = await readPackageJson(currentProjectPkgJsonPath));
  } else {
    projectName = projectNameOrRootPath;
  }

  const monoBaseData = await getMonorepoBaseData(cwd, extraMonorepoStrategies);
  if (!monoBaseData.isMonorepo) {
    return [];
  }


  const projects = await getMonorepoSubProjects(monoBaseData);
  const currentProject = projects.find(project => project.name === projectName);

  if (!currentProject) {
    return [];
  }

  let dependentProjects = currentProject.getDependentProjects(projects, {
    recursive,
  });
  dependentProjects = await filterProjects(dependentProjects, filter);

  return dependentProjects;
};

export { getDependentProjects };
