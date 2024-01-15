# jupyterlab-open-url-parameter

[![Extension status](https://img.shields.io/badge/status-ready-success 'ready to be used')](https://jupyterlab-contrib.github.io/)
[![Github Actions Status](https://github.com/jupyterlab-contrib/jupyterlab-open-url-parameter/workflows/Build/badge.svg)](https://github.com/jupyterlab-contrib/jupyterlab-open-url-parameter/actions/workflows/build.yml)
[![JupyterLite](https://jupyterlite.rtfd.io/en/latest/_static/badge-launch.svg)](https://jupyterlab-open-url-param.readthedocs.io/en/latest/lite/lab)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab-contrib/jupyterlab-open-url-parameter/main?urlpath=lab)

JupyterLab extension to open files passed via a URL parameter.

## Requirements

- JupyterLab >= 4.0

## Install

To install the extension, run the following command:

```bash
pip install jupyterlab-open-url-parameter
```

## Usage

The extension will open a file passed via a URL parameter. The URL parameter is `fromURL`. It is possible to pass multiple files via the `fromURL` parameter. The files will be opened in the order they are passed.

For example if you would like to open a notebook and a csv file:

- https://raw.githubusercontent.com/jupyterlab/jupyterlab-demo/master/notebooks/Lorenz.ipynb
- https://raw.githubusercontent.com/jupyterlab/jupyterlab-demo/master/data/iris.csv

You can append the following to the URL of your JupyterLab instance: `?fromURL=https://raw.githubusercontent.com/jupyterlab/jupyterlab-demo/master/notebooks/Lorenz.ipynb&fromURL=https://raw.githubusercontent.com/jupyterlab/jupyterlab-demo/master/data/iris.csv`

Which will result in the following URL when JupyterLab is running locally:

http://localhost:8888/lab?fromURL=https://raw.githubusercontent.com/jupyterlab/jupyterlab-demo/master/data/iris.csv&fromURL=https://raw.githubusercontent.com/jupyterlab/jupyterlab-demo/master/notebooks/Lorenz.ipynb

https://user-images.githubusercontent.com/591645/230422671-c12761e9-9b9f-4d23-ab66-344568c6b0a5.mp4

ℹ️ This extension uses the command `filebrowser:open-url` available in JupyterLab by default.

### Using the extension in JupyterLite

The extension can also be used in [JupyterLite](https://jupyterlite.readthedocs.io). Check out the documentation to learn more about adding extensions to JupyterLite.

https://user-images.githubusercontent.com/591645/230426591-04b5155d-3297-4401-b979-d86561188c17.mp4

## Uninstall

To remove the extension, run the following command:

```bash
pip uninstall jupyterlab-open-url-parameter
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab_open_url_parameter directory
# Install package in development mode
pip install -e "."
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall jupyterlab-open-url-parameter
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-open-url-parameter` within that folder.

### Packaging the extension

See [RELEASE](RELEASE.md)
