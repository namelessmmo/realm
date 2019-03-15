'use strict';

var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
var HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
var LiveReloadPlugin = require('webpack-livereload-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const path = require('path');

var distDir = path.resolve(__dirname, 'public', 'dist');

module.exports = {
  // Entry point : first executed file
  // This may be an array. It will result in many output files.
  entry: './public/src/main.ts',

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
    filename: '[name].js',
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
      }
    ]
  },


  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'public/src/index.html'
    }),
    new HardSourceWebpackPlugin(),
    new LiveReloadPlugin({
      appendScriptTag: true
    }),
    new FileManagerPlugin({
      onEnd: {
        copy: [
          { source: 'public/src/assets', destination: distDir+"/assets"}
        ]
      }
    }),
  ]
};