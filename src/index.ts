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
        const folderParamName = 'fromURLToFolder';
        const paths = urlParams.getAll(paramName);
        if (paths.length === 0) {
          return;
        }
        const urls = paths;
        const folder = (urlParams.get(folderParamName) ?? '').trim();
        const normalizedFolder = folder
          ? PathExt.removeSlash(PathExt.normalize(folder))
          : '';
        const uploadDirectory =
          normalizedFolder === '.' ? '' : normalizedFolder;
        const folderSegments = uploadDirectory.split('/').filter(Boolean);
        const hasParentDirectorySegment = folderSegments.some(
          part => part === '..'
        );

        // handle the route and remove the fromURL parameter
        const handleRoute = () => {
          const url = new URL(URLExt.join(PageConfig.getBaseUrl(), request));
          // only remove parameters handled by the extension
          url.searchParams.delete(paramName);
          url.searchParams.delete(folderParamName);
          const { pathname, search } = url;
          router.navigate(`${pathname}${search}`, { skipRouting: true });
        };

        const ensureDirectory = async (
          directory: string,
          basePath = ''
        ): Promise<void> => {
          if (!directory) {
            return;
          }

          const isNotFoundError = (reason: any): boolean => {
            const message = String(reason?.message ?? reason);
            return (
              reason?.response?.status === 404 ||
              message.includes('Could not find content with path')
            );
          };

          const isConflictError = (reason: any): boolean => {
            const message = String(reason?.message ?? reason).toLowerCase();
            return (
              reason?.response?.status === 409 ||
              message.includes('already exists')
            );
          };

          const contents =
            browser?.model.manager.services.contents ??
            app.serviceManager.contents;
          const cleanupCreated = async (path: string): Promise<void> => {
            await contents.delete(path).catch(() => undefined);
          };
          let currentPath = basePath;
          for (const part of directory.split('/').filter(Boolean)) {
            const parentPath = currentPath;
            currentPath = contents.resolvePath(currentPath, part);
            try {
              const model = await contents.get(currentPath, { content: false });
              if (model.type !== 'directory') {
                throw new Error(
                  trans.__('Path is not a directory: %1', currentPath)
                );
              }
            } catch (reason) {
              if (!isNotFoundError(reason)) {
                throw reason;
              }
              const created = await contents.newUntitled({
                path: parentPath,
                type: 'directory'
              });
              if (created.path === currentPath) {
                continue;
              }

              try {
                await contents.rename(created.path, currentPath);
              } catch (renameReason) {
                if (isConflictError(renameReason)) {
                  await cleanupCreated(created.path);
                  continue;
                }

                await cleanupCreated(created.path);
                throw renameReason;
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
          let changedDirectory = false;

          try {
            if (uploadDirectory && browser) {
              const contents = browser.model.manager.services.contents;
              await ensureDirectory(uploadDirectory, currentDirectory);
              await browser.model.refresh();
              const targetDirectory = contents.resolvePath(
                currentDirectory,
                uploadDirectory
              );
              await browser.model.cd(targetDirectory);
              changedDirectory = true;
            }

            for (const url of targets) {
              await fetchAndOpen(url);
            }
          } catch (error) {
            return showErrorMessage(
              trans._p('showErrorMessage', 'Upload Error'),
              error as Error
            );
          } finally {
            if (changedDirectory && browser) {
              try {
                await browser.model.cd(currentDirectory);
              } catch (reason) {
                void showErrorMessage(
                  trans._p('showErrorMessage', 'Upload Error'),
                  reason as Error
                );
              } finally {
                void browser.model.refresh();
              }
            }
          }
        };

        if (normalizedFolder && hasParentDirectorySegment) {
          await showErrorMessage(
            trans.__('Invalid folder path'),
            trans.__(
              'The "%1" parameter cannot contain ".." segments.',
              folderParamName
            )
          );
          handleRoute();
          return;
        }

        const [match] = matches;
        // handle opening the URL with the Notebook 7 separately
        if (match?.includes('/notebooks') || match?.includes('/edit')) {
          const [first] = urls;
          try {
            await openUrls([first]);
          } finally {
            handleRoute();
          }
          return;
        }

        app.restored.then(async () => {
          try {
            await openUrls(urls);
          } finally {
            handleRoute();
          }
        });
      }
    });

    router.register({ command, pattern: URL_PATTERN });
  }
};

export default plugin;
