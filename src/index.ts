import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

/**
 * The regular expression matching the lab URL.
 */
const URL_PATTERN = new RegExp('/lab/?');

/**
 * Initialization data for the jupyterlab-open-url-parameter extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-open-url-parameter:plugin',
  autoStart: true,
  requires: [IRouter],
  activate: (app: JupyterFrontEnd, router: IRouter) => {
    const { commands } = app;

    const command = 'router:fromUrl';
    commands.addCommand(command, {
      execute: (args: any) => {
        const parsed = args as IRouter.ILocation;
        // use request to do the matching
        const { request, search } = parsed;
        const matches = request.match(URL_PATTERN) ?? [];
        if (!matches) {
          return;
        }

        const urlParams = new URLSearchParams(search);
        const paramName = 'fromURL';
        const paths = urlParams.getAll(paramName);
        if (!paths) {
          return;
        }
        const urls = paths.map(path => decodeURIComponent(path));
        app.restored.then(() => {
          // use the JupyterLab command to open the file from the URL
          urls.forEach(url => {
            void commands.execute('filebrowser:open-url', { url });
          });
          const url = new URL(URLExt.join(PageConfig.getBaseUrl(), request));
          // only remove the fromURL parameter
          url.searchParams.delete(paramName);
          const { pathname, search } = url;
          router.navigate(`${pathname}${search}`, { skipRouting: true });
        });
      }
    });

    router.register({ command, pattern: URL_PATTERN });
  }
};

export default plugin;
