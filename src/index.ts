import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { showErrorMessage } from '@jupyterlab/apputils';

import { PageConfig, PathExt, URLExt } from '@jupyterlab/coreutils';

import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

/**
 * The regular expression matching the lab URL.
 */
const URL_PATTERN = new RegExp('/(lab|notebooks|edit)/?');

/**
 * Initialization data for the jupyterlab-open-url-parameter extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-open-url-parameter:plugin',
  autoStart: true,
  requires: [IRouter, ITranslator],
  optional: [IDefaultFileBrowser],
  activate: (
    app: JupyterFrontEnd,
    router: IRouter,
    translator: ITranslator,
    browser: IDefaultFileBrowser | null
  ) => {
    const { commands } = app;
    const trans = translator.load('jupyterlab') ?? nullTranslator;

    const command = 'router:fromUrl';
    commands.addCommand(command, {
      execute: async (args: any) => {
        const parsed = args as IRouter.ILocation;
        // use request to do the matching
        const { request, search } = parsed;
        const matches = request.match(URL_PATTERN) ?? [];
        if (!matches) {
          return;
        }

        const urlParams = new URLSearchParams(search);
        const paramName = 'fromURL';
        const folderParamName = 'folder';
        const paths = urlParams.getAll(paramName);
        if (paths.length === 0) {
          return;
        }
        const urls = paths;
        const folder = urlParams.get(folderParamName) ?? '';
        const normalizedFolder = folder ? PathExt.normalize(folder) : '';
        const trimmedFolder =
          normalizedFolder !== '/' && normalizedFolder.endsWith('/')
            ? normalizedFolder.slice(0, -1)
            : normalizedFolder;
        const folderPath = PathExt.removeSlash(trimmedFolder);
        const uploadDirectory = normalizedFolder
          ? folderPath === '.'
            ? ''
            : folderPath
          : '';

        // handle the route and remove the fromURL parameter
        const handleRoute = () => {
          const url = new URL(URLExt.join(PageConfig.getBaseUrl(), request));
          // only remove parameters handled by the extension
          url.searchParams.delete(paramName);
          url.searchParams.delete(folderParamName);
          const { pathname, search } = url;
          router.navigate(`${pathname}${search}`, { skipRouting: true });
        };

        const ensureDirectory = async (directory: string): Promise<void> => {
          if (!directory) {
            return;
          }

          const contents = app.serviceManager.contents;
          let currentPath = '';
          for (const part of directory.split('/').filter(Boolean)) {
            currentPath = currentPath ? PathExt.join(currentPath, part) : part;
            try {
              const model = await contents.get(currentPath, { content: false });
              if (model.type !== 'directory') {
                throw new Error(
                  trans.__('Path is not a directory: %1', currentPath)
                );
              }
            } catch (reason) {
              const error = reason as any;
              if (error?.response?.status !== 404) {
                throw reason;
              }
              try {
                await contents.save(currentPath, {
                  type: 'directory'
                });
              } catch (saveReason) {
                const saveError = saveReason as any;
                if (saveError?.response?.status !== 409) {
                  throw saveReason;
                }
              }
            }
          }
        };

        // fetch the file from the URL and open it with the docmanager
        const fetchAndOpen = async (url: string): Promise<void> => {
          let type = '';
          let blob;

          // fetch the file from the URL
          try {
            const req = await fetch(url);
            blob = await req.blob();
            type = req.headers.get('Content-Type') ?? '';
          } catch (err) {
            const reason = err as any;
            if (reason.response && reason.response.status !== 200) {
              reason.message = trans.__('Could not open URL: %1', url);
            }
            return showErrorMessage(trans.__('Cannot fetch'), reason);
          }

          // upload the content of the file to the server
          try {
            // FIXME: handle Content-Disposition: https://github.com/jupyterlab/jupyterlab/issues/11531
            const name = PathExt.basename(url);
            const model = await browser?.model.upload(
              new File([blob], name, { type })
            );

            if (!model) {
              return;
            }

            return commands.execute('docmanager:open', {
              path: model.path,
              options: {
                ref: '_noref'
              }
            });
          } catch (error) {
            return showErrorMessage(
              trans._p('showErrorMessage', 'Upload Error'),
              error as Error
            );
          }
        };

        const openUrls = async (targets: string[]): Promise<void> => {
          const currentDirectory = browser?.model.path ?? '';

          if (uploadDirectory && browser) {
            await ensureDirectory(uploadDirectory);
            await browser.model.cd(uploadDirectory);
          }

          try {
            for (const url of targets) {
              await fetchAndOpen(url);
            }
          } finally {
            if (uploadDirectory && browser) {
              await browser.model.cd(currentDirectory);
              void browser.model.refresh();
            }
          }
        };

        const [match] = matches;
        // handle opening the URL with the Notebook 7 separately
        if (match?.includes('/notebooks') || match?.includes('/edit')) {
          const [first] = urls;
          await openUrls([first]);
          handleRoute();
          return;
        }

        app.restored.then(async () => {
          await openUrls(urls);
          handleRoute();
        });
      }
    });

    router.register({ command, pattern: URL_PATTERN });
  }
};

export default plugin;
