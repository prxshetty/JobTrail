const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

const env = dotenv.config().parsed;

module.exports = {
  entry: {
    background: './background.js',
    contentScript: './contentScript.js',
    popup: './popup.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
      'process.env.GOOGLECLIENTID': JSON.stringify(env.GOOGLECLIENTID),
      'process.env.EXTENSIONKEY': JSON.stringify(env.EXTENSIONKEY)
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: 'manifest.json', 
          to: 'manifest.json',
          transform(content) {
            let manifestJson = content.toString();
            manifestJson = manifestJson.replace('__GOOGLECLIENTID__', env.GOOGLECLIENTID);
            manifestJson = manifestJson.replace('__EXTENSIONKEY__', env.EXTENSIONKEY);
            return manifestJson;
          },
        },
        { from: 'icon.png', to: 'icon.png' },
        { from: 'styles.css', to: 'styles.css' },
        { from: 'popup.html', to: 'popup.html' }
      ],
    }),
    new Dotenv()
  ],
  mode: 'production',
  optimization: {
    minimize: false
  },
  devtool: false
};