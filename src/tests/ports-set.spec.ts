

// import * as _ from 'lodash';
// import * as path from 'path';
// import { describe } from 'mocha'
// import { expect, use } from 'chai'
// import { Range } from '../helpers';
// import { ProjectFrom, Project } from '../project';
// import { PortInstance } from '../tnp-db/entites/port-instance';
// import { SystemService } from '../models/system-service';
// import { PortsSet } from '../tnp-db/controllers/ports-set';





// describe('Ports set tests', () => {


//   const baseline = ProjectFrom(path.join(Project.Tnp.location, 'projects', 'container', 'baseline'));
//   const tnp = Project.Tnp;


//   it('should call save after each add', async function () {

//     let saveCallCounter = 0;
//     let s = new PortsSet([], () => {
//       saveCallCounter++;
//     })

//     s.add(new PortInstance(Range.from(3000).to(4000)))
//     s.add(new PortInstance(80, new SystemService('http')))
//     s.add(new PortInstance([21, 22], new SystemService('System communication')))
//     s.add(new PortInstance(Range.from(4100).to(4110), baseline))

//     expect(saveCallCounter).to.be.eq(4);


//   });

//   it('should calculate,remove,add,update correcly', async function () {

//     let s = new PortsSet([
//       new PortInstance([2000, 2001])
//     ])

//     expect(s.numOfFreePortsAvailable).to.be.eq(2)
//     s.update(new PortInstance([2000, 2001], new SystemService('test')))
//     expect(s.numOfFreePortsAvailable).to.be.eq(0)

//     const twoThousandsFreePors = new PortInstance(Range.from(3000).to(5000))
//     s.add(twoThousandsFreePors)
//     expect(s.numOfFreePortsAvailable).to.be.eq(2000)
//     expect(s.numOfAllPortsAvailable).to.be.eq(2002)
//     s.remove(twoThousandsFreePors)
//     expect(s.numOfFreePortsAvailable).to.be.eq(0)
//     expect(s.numOfAllPortsAvailable).to.be.eq(2)



//   });

//   it('should return project ports', async function () {

//     let baselinePorts = [
//       new PortInstance(3000, baseline),
//       new PortInstance(4000, baseline)
//     ]

//     let s = new PortsSet([
//       new PortInstance([2000, 2001]),
//       ...baselinePorts
//     ])

//     expect(_.isEqual(s.getReserverFor(baseline), baselinePorts)).to.be.true;

//     baselinePorts = []

//     expect(_.isEqual(s.getReserverFor(baseline), baselinePorts)).to.be.false;

//   });


//   it('should reserve correcly ports for standalone porject', async function () {

//     let s = new PortsSet([
//       new PortInstance(4000, baseline),
//       new PortInstance(6000),
//       new PortInstance(Range.from(7000).to(7005))
//     ])

//     expect(s.reserveFreePortsFor(tnp)).to.be.true;

//     // console.log(TnpDB.prepareToSave.ports(s._ports))

//   });

//   it('should reserve correcly ports for workspace porject', async function () {

//     let s = new PortsSet([
//       new PortInstance(4000),
//       new PortInstance(6000),
//       new PortInstance(Range.from(7000).to(7010))
//     ])

//     expect(s.reserveFreePortsFor(baseline)).to.be.true;
//     expect(s.numOfTakenPortsAvailable).to.be.eq(baseline.children.length + 1)

//     // console.log(TnpDB.prepareToSave.ports(s._ports))

//   });

//   it('should not reserve ports if is not a space', async function () {

//     let s = new PortsSet([
//       new PortInstance(Range.from(7000).to(baseline.children.length))
//     ])

//     expect(s.reserveFreePortsFor(baseline)).to.be.false;

//   });


// });
