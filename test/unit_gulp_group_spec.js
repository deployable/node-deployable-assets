const expect = require('chai').expect
const { GulpGroup } = require('../')


describe('unit::deployable-assets::GulpGroup', function(){

  describe('class', function(){

    let grp = null

    beforeEach( function(){
      grp = new GulpGroup('somegroup')
    })

    it('should create an instance', function(){
      expect( grp ).to.be.ok
    })

    it('should set the dest of a task', function(){
      let tsk = grp.task('atsk')
      expect( tsk ).to.be.ok
      expect( tsk.name ).to.equal( 'atsk')
    })

    it('should turn group into string', function(){
      expect( grp.toString() ).to.equal( 'somegroup' )
    })

    it('should turn group with task into string', function(){
      grp.task('atsk')
      expect( grp.toString() ).to.equal( `somegroup\nsomegroup:atsk` )
    })

    it('should turn group with task into string', function(){
      grp.task('atsk')
      grp.watch('atsk')
      expect( grp.toString() ).to.equal( `somegroup\nsomegroup:atsk\nsomegroup:watch` )
    })

    it('should turn group with task into string', function(){
      grp.task('atsk')
      grp.watch()
      expect( grp.toString() ).to.equal( `somegroup\nsomegroup:atsk\nsomegroup:watch` )
    })

    it('should turn two groups into string', function(){
      grp.task('tsk1')
      grp.task('tsk2')
      let json = grp.toJSON()
      expect( json ).to.have.keys('name', 'tasks')
      expect( json.name ).to.equal( 'somegroup' )
      expect( json.tasks ).to.have.keys('tsk1', 'tsk2')
    })

    it('should get globs from tasks', function(){
      grp.task('tsk1').addSrc('test1')
      grp.task('tsk2').addSrc('test2')
      expect( grp.getGlobs() ).to.eql( ['test1', 'test2'] )
    })

    it('should set a group dest', function(){
      grp.setDest('test')
      expect( grp.dest ).to.eql( 'test' )
    })

  })

})
