const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const CopyPlugin = require('copy-webpack-plugin');

// Load environment variables from .env file
const env = dotenv.config().parsed;

module.exports = {
  entry: {
    background: './background.js',
    contentScript: './contentScript.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID)
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: 'manifest.json', 
          to: 'manifest.json',
          transform(content) {
            return content.toString().replace('__GOOGLE_CLIENT_ID__', env.GOOGLE_CLIENT_ID);
          },
        },
        { from: 'icon.png', to: 'icon.png' },
        { from: 'styles.css', to: 'styles.css' }
      ],
    }),
  ],
  mode: 'production',
  optimization: {
    minimize: false
  },
  devtool: false
};