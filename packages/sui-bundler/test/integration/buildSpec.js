const fs = require('fs')
const path = require('path')
const util = require('util')
const {expect} = require('chai')
const exec = util.promisify(require('child_process').exec)

const SUI_BUNDLER_BINARY_DIR = path.join(__dirname, '..', '..', 'bin')
const FEATURES_APP_PATH = path.join(__dirname, 'features-app')
const OFFLINE_APP_PATH = path.join(__dirname, 'offline-app')

describe('sui-bundler', () => {
  it('Regresion test for features', async function() {
    this.timeout(0)
    const CDN = 'https://my-cdn.com/'
    const {stdout} = await exec(
      `node "${SUI_BUNDLER_BINARY_DIR}/sui-bundler-build" -C`,
      {
        cwd: FEATURES_APP_PATH,
        env: {
          ...process.env,
          CDN,
          APP_NAME: 'test_app'
        }
      }
    )

    const {stdout: lsStdout} = await exec(
      `ls "${FEATURES_APP_PATH}/public" | grep -E "br|gz" || true`,
      {
        cwd: FEATURES_APP_PATH
      }
    )

    const manifest = require(path.join(
      `${FEATURES_APP_PATH}/public/asset-manifest.json`
    ))

    const mainJS = manifest['main.js'].replace(CDN, '')

    expect(stdout.indexOf('Error')).to.be.eql(-1)
    expect(lsStdout).to.be.not.eql('')
    expect(
      fs.existsSync(
        path.join(`${FEATURES_APP_PATH}/public/asset-manifest.json`)
      )
    ).to.be.true
    expect(
      fs
        .readFileSync(path.join(`${FEATURES_APP_PATH}/public/index.html`))
        .indexOf(CDN)
    ).to.be.not.eql(-1)
    expect(
      fs
        .readFileSync(path.join(`${FEATURES_APP_PATH}/public/${mainJS}`))
        .indexOf('test_app')
    ).to.be.not.eql(-1)
    expect(
      fs
        .readFileSync(path.join(`${FEATURES_APP_PATH}/public/${mainJS}`))
        .indexOf('DEFAULT_VALUE')
    ).to.be.not.eql(-1)
  })

  it('Offline Page', async function() {
    this.timeout(0)
    const {stdout} = await exec(
      `node "${SUI_BUNDLER_BINARY_DIR}/sui-bundler-build" -C`,
      {
        cwd: OFFLINE_APP_PATH
      }
    )

    const manifest = require(path.join(
      `${OFFLINE_APP_PATH}/public/asset-manifest.json`
    ))

    Object.entries(manifest).forEach(([original, hashed]) => {
      original.match('runtime')
        ? expect(
            fs
              .readFileSync(
                path.join(`${OFFLINE_APP_PATH}/public/service-worker.js`)
              )
              .indexOf(hashed)
          ).to.be.eql(-1)
        : expect(
            fs
              .readFileSync(
                path.join(`${OFFLINE_APP_PATH}/public/service-worker.js`)
              )
              .indexOf(hashed)
          ).to.be.not.eql(-1)
    })

    expect(stdout.indexOf('Error')).to.be.eql(-1)
    expect(fs.existsSync(path.join(`${OFFLINE_APP_PATH}/public/offline.html`)))
      .to.be.true
    expect(
      fs.existsSync(path.join(`${OFFLINE_APP_PATH}/public/service-worker.js`))
    ).to.be.true
    expect(
      fs
        .readFileSync(path.join(`${OFFLINE_APP_PATH}/public/service-worker.js`))
        .indexOf('importScripts("https://external_url.com")')
    ).to.be.not.eql(-1)
  })
})
