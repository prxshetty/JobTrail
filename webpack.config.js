const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables from .env file
const env = dotenv.config().parsed;

module.exports = {
  entry: {
    contentScript: './contentScript.js',
    background: './background.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '.') // Changed from 'dist' to '.'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY)
    })
  ],
  mode: 'production', // Change to production mode
  optimization: {
    minimize: false // Disable minimization to avoid eval
  },
  devtool: false // Disable source maps
};