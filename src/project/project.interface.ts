import { LibType, EnvironmentName } from '../models';
import { EnvironmentConfig } from './features/environment-config';
import { Project } from './project';

export interface IProject {
  isSite: boolean;
  isCoreProject: boolean;
  isBuildedLib: boolean;
  isCommandLineToolOnly: boolean;
  isGenerated: boolean;
  isWorkspaceChildProject: boolean;
  isBasedOnOtherProject: boolean;
  isWorkspace: boolean;
  isContainer: boolean;
  isContainerChild: boolean;
  isStandaloneProject: boolean;
  isTnp: boolean;
  isCloud: boolean;
  useFramework: boolean;
  name: string;
  defaultPort?: number;
  version: string;
  _routerTargetHttp?: string;
  customizableFilesAndFolders: string[];
  type: LibType;
  backupName: string;
  location: string;
  resources: string[];
  env: EnvironmentConfig;
  allowedEnvironments: EnvironmentName[];
  children: Project[];
  parent: Project;
  preview: Project;
  requiredLibs: Project[];
  baseline: Project;
}
