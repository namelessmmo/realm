'use strict';

var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
var HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
var LiveReloadPlugin = require('webpack-livereload-plugin');
const WebpackAssetsManifest = require('webpack-assets-manifest');
const path = require('path');

var distDir = path.resolve(__dirname, 'public', 'dist');

module.exports = {
  // Entry point : first executed file
  // This may be an array. It will result in many output files.
  entry: {
    assets: './public/src/assets.js',
    main: './public/src/main.ts',
  },

  // What files webpack will manage
  resolve: {
    extensions: ['.js', '.ts', '.tsx']
  },

  watch: true,

  // Make errors mor clear
  devtool: 'inline-source-map',

  // Configure output folder and file
  output: {
    path: distDir,
    filename: '[name]-[hash].js',
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader'
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        loader: 'file-loader',
        options: {
          outputPath: (url, resourcePath, context) => {
            const publicPrefix = "public/src/";
            let relativePath = path.relative(context, resourcePath).slice(publicPrefix.length);
            relativePath = relativePath.substring(0, relativePath.lastIndexOf("/"));
            return `${relativePath}/${url}`
          },
        }
      },
      {
        test: /\.hbs$/,
        loader: 'file-loader',
        options: {
          outputPath: (url, resourcePath, context) => {
            const publicPrefix = "public/src/";
            let relativePath = path.relative(context, resourcePath).slice(publicPrefix.length);
            relativePath = relativePath.substring(0, relativePath.lastIndexOf("/"));
            return `${relativePath}/${url}`
          },
        }
      },
      {
        type: 'javascript/auto', // prevents parsing json files
        test: /\.json$/,
        loader: 'file-loader',
        options: {
          outputPath: (url, resourcePath, context) => {
            const publicPrefix = "public/src/";
            let relativePath = path.relative(context, resourcePath).slice(publicPrefix.length);
            relativePath = relativePath.substring(0, relativePath.lastIndexOf("/"));
            return `${relativePath}/${url}`
          },
        }
      },
    ]
  },


  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'public/src/index.html'
    }),
    new HardSourceWebpackPlugin(),
    new HardSourceWebpackPlugin.ExcludeModulePlugin([
      {
        test: /assets\/.*/
      },
      {
        test: /manifest.json/
      }
    ]),
    new LiveReloadPlugin({
      appendScriptTag: true
    }),
    new WebpackAssetsManifest({
      customize(entry, original) {

        if (entry.key.endsWith(".js")) {
          // only include actual assets (images, ect...)
          return false
        }

        const assetsPrefix = "assets/";

        return {
          key: entry.key.slice(assetsPrefix.length).split('.').slice(0, -1).join('.'),
          value: original.value
        }
      }
    }),
  ]
};