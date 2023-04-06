import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab-open-url-parameter extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-open-url-parameter:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-open-url-parameter is activated!');
  }
};

export default plugin;
