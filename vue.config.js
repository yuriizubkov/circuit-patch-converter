module.exports = {
  transpileDependencies: [
    'vuetify'
  ],
  publicPath: process.env.NODE_ENV === 'production'
    ? '/circuit-patch-converter/'
    : '/',
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = "Circuit Patch Converter";
        return args;
      })
  }
}
