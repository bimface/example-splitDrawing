module.exports = {
  devServer: {
    proxy: {
      '/test': {
        target: 'http://bimface.com/api/console/share/preview',
        pathRewrite: { '^/test': '' }
      },
    }
  }
}