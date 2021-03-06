const debug = require('debug')('dply:assets:gulp_group_task')
const path = require('path')

const sass = require('gulp-sass')
const shell = require('gulp-shell')
const babel = require('gulp-babel')
const gdebug = require('gulp-debug')
const plumber = require('gulp-plumber')
const sourcemaps = require('gulp-sourcemaps')
const gulpSequence = require('gulp-sequence')
const webpackstream = require('webpack-stream')

const { pick, each } = require('lodash')
const { GulpDestMixin } = require('./gulp_dest_mixin')


// ## class GulpGroupTask

class GulpGroupTask extends GulpDestMixin {

  static init(){

  }

  constructor(name, group, rootgulp, options = {} ){
    super(name, group)
    this.name = name
    this.parent = group
    this.root = rootgulp
    this.globs = []
    this.gulp = options.gulp || this.root.gulp
  }

  get full_name(){
    let name_prefix = this.parent.full_name
    if ( name_prefix === '' ) return this.name
    return `${name_prefix}:${this.name}`
  }

  addSrc(...args){ return this.addGlob(...args) }
  addGlob(path){
    this.globs.push(path)
    return this
  }
  getGlobs(){
    return this.globs
  }

  toJSON(){
    let o = pick(this, ['name','globs','dest'])
    o.name = this.name
    o.globs = this.globs
    o.dest = this.dest
    if (this.parent) o.group = this.parent.name
    return o
  }

  toString(){
    return `${this.full_name}`
  }


  // ### Tasks

  // Copy src files to dest
  createCopyTask(){

    let gulp_opts = { cwd: this.cwd }

    let copy_fn = () => {

      let g = this.gulp.src(this.globs)

      if (this.debug) g = g.pipe( gdebug({ title: `copytask ${this.full_name} src` }) )

      g = g.pipe( this.gulp.dest(this.dest, gulp_opts) )

      if (this.debug) g = g.pipe( gdebug({ title: `copytask ${this.full_name} dest` }))

      return g
    }

    this.gulp.task(`${this.full_name}`, copy_fn)

    return true
  }

  // WebPack + Babel
  //createWebpackTask( options = {}, webpack_config ){
  createWebpackTask( options = {} ){

    //if ( webpack_config ) throw new Error('Not supported yet')

    // Create the webpack config object
    let webpack_config = {}
    let gulp_opts = { cwd: this.cwd }

    // Create the `webpack.entry` object
    let src = ( options.src ) ? options.src : 'app/assets/js/*.js'
    let files = require('glob').sync(src, gulp_opts)
    if ( files.length === 0 ) console.error(`No webpack files matched for src ${src}`)
    debug('found files', files)
    options.entries = {}
    each( files, filepath => {
      let filename = path.basename(filepath, path.extname(filepath))
      options.entries[filename] = path.join(process.cwd(), filepath)
    })

    // Add the source files as entry points
    webpack_config.entry = options.entries

    // Add the output info
    let dest_default = path.join( process.cwd(), 'app', 'public', 'assets', 'js' )
    let dest = ( options.dest ) ? options.dest : dest_default
    webpack_config.output = {
        path: dest,
        filename: options.destname || '[name].pack.js'
      },

    // Webpack modules

    webpack_config.module = { loaders: [] }

    /* istanbul ignore next */
    if ( options.babel ) {
      let test = ( options.babel.test ) ? options.babel.test : /\.js?x$/
      webpack_config.module.loaders.push({
        test: test,
        loader: 'babel-loader'
      })
    }

    if ( options.sourcemap ) webpack_config.devtool = 'source-map'

    // Webpack plugins

    webpack_config.plugins = []

    /* istanbul ignore next */
    if ( options.uglify ) {
      webpack_config.plugins.push( new require('webpack').optimize.UglifyJsPlugin({
          compress: { warnings: false },
          output: { comments: false }
        })
      )
    }

    debug('webpack_config', webpack_config)

    let webpack_fn = () => {
      let g = this.gulp.src(this.globs)

      if (this.debug) g = g.pipe( gdebug({ title: `webpacktask ${this.full_name}` }) )

      // Only log errors when watching
      /* istanbul ignore next */
      g = g.pipe( plumber(err => {
          if (this.gulp.watching) console.error(err)
          else throw err
      }))

      // Run webpack
      g = g.pipe( webpackstream(webpack_config) )

      // Save the files
      g = g.pipe( this.gulp.dest(this.dest) )

      // Return the steam so gulp can tell it finished
      return g
    }

    debug('wbpack dest', this.dest, this.cwd)

    this.gulp.task(`${this.full_name}`, webpack_fn)

    return true
  }

  // Babel
  createBabelTask( options = {presets: ['es2015']} ){
    let sourcemap = options.sourcemap
    delete options.sourcemap

    let gulp_cwd_opts = { cwd: this.cwd }

    let babel_fn = () => {

      let g = this.gulp.src(this.globs)

      // Debug
      if (this.debug || this.debug_src){
        g = g.pipe( gdebug({ title: `babeltask ${this.full_name} src` }) )
      }

      // Watch prints errors, run throws errors
      /* istanbul ignore next */
      g = g.pipe( plumber(err => {
          if (this.gulp.watching) console.error(err)
          else throw err
      }))

      // Sourcemaps
      if (sourcemap) g = g.pipe(sourcemaps.init())

      // Babel
      g = g.pipe(babel(options))

      // Sourcemaps
      if (sourcemap) g = g.pipe(sourcemaps.write('.'))

      // Write the files
      g = g.pipe(this.gulp.dest(this.dest, gulp_cwd_opts))

      // Some dest debug
      if (this.debug || this.debug_dest){
        g = g.pipe( gdebug({ title: `babeltask ${this.full_name} dest` }) )
      }

      return g
    }

    debug('babel dest', this.dest, this.cwd)

    this.gulp.task(`${this.full_name}`, babel_fn)

    return true
  }


  // Babel with sourcemaps
  createBabelSourceMapTask( babel_options = {presets: ['es2015']} ){
    babel_options.sourcemap = true
    this.createBabelTask(babel_options)
    return true
  }

  // Sass
  createSassTask( options = {} ){
    let self = this
    //if (options.debug) this.debug = options.debug

    let gulp_cwd_opts = { cwd: this.cwd }

    let sass_fn = ()=> {
      let g = this.gulp.src(this.globs)

      // Some debug
      if (this.debug) g = g.pipe( gdebug({ title: `sasstask ${this.full_name} src` }) )

      // Sourcemaps
      if (options.sourcemap) g = g.pipe( sourcemaps.init() )

      // Do the sass, capture error
      /* istanbul ignore next */
      g = g.pipe( sass().on('error', function(err){
        sass.logError.call(this, err)
        if (!self.gulp.watching) throw err
      }))

      // Sourcemaps
      if (options.sourcemap) g = g.pipe( sourcemaps.write('.') )

      // Dest files
      g = g.pipe( this.gulp.dest(this.dest, gulp_cwd_opts) )

      // Some more debug
      if (this.debug) g = g.pipe( gdebug({ title: `sasstask ${this.full_name} dest` }) )

      return g
    }

    debug('sass dest', this.dest, this.cwd)

    this.gulp.task(`${this.full_name}`, sass_fn)

    return true
  }

  // Sass with sourcemaps
  createSassSourceMapTask( options = {} ){
    options.sourcemap = true
    return this.createSassTask( options )
  }

  // Run something in the shell
  run(commands){ return this.createShellTask(commands) }
  createShellTask(commands){
    this.gulp.task(`${this.full_name}`, shell.task(commands))
    return true
  }

  // Run a gulp-sequence of tasks
  createSequence(...args){
    this.gulp.task(`${this.full_name}`, gulpSequence(...args))
    return true
  }

  // Define a custom gulp task. Just pass the callback function
  // you would to `gulp.task()`.
  // Use `()=>{}` if you want `this` to refer to your gulp definition
  createCustom(fn){
    this.gulp.task(`${this.full_name}`, fn)
    return true
  }

}

GulpGroupTask.init()

module.exports = { GulpGroupTask }

