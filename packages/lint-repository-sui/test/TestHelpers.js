import {expect} from 'chai'
import {stub} from 'sinon'
export class RuleTester {
  id
  handler

  static create(id, handler) {
    return new RuleTester(id, handler)
  }

  constructor(id, handler) {
    this.handler = handler
    this.id = id
  }

  run(assertions) {
    const instance = this

    Object.entries(assertions).forEach(([kind, tests]) => {
      describe(`[${kind.toUpperCase()}] ${this.id}`, function () {
        beforeEach(function () {
          this.ctxt = {
            report: stub(),
            monitoring: stub()
          }
        })
        afterEach(function () {
          this.ctxt.report.reset()
          this.ctxt.monitoring.reset()
        })

        tests.forEach(assertion => {
          const {monitoring, report, name, ...rest} = assertion
          Object.entries(rest).forEach(([FSPattern, matches]) => {
            it(name ?? FSPattern, function () {
              instance.handler.create(this.ctxt)[FSPattern](matches)
              monitoring && expect(this.ctxt.monitoring.calledWith(monitoring)).to.be.eql(true)
              report && expect(instance._formatMessages(this.ctxt.report)).to.be.eqls(report)
              expect(true).to.be.eql(true)
            })
          })
        })
      })
    })
  }

  _formatMessages(stub) {
    const report = stub.firstCall.firstArg
    return Object.entries(report.data ?? {}).reduce((acc, [key, value]) => {
      return acc.replaceAll(`{{${key}}}`, value)
    }, this.handler.meta.messages[report.messageId])
  }
}

export class MatchStub {
  static create({parsed, raw}) {
    return new MatchStub(parsed, raw)
  }

  constructor(parsed, raw) {
    this.parsed = parsed
    this.raw = raw
  }
}
