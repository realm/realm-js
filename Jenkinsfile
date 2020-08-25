#!groovy
import groovy.json.JsonOutput

@Library('realm-ci') _
repoName = 'realm-js' // This is a global variable

// These versions must be written in ascending order (lowest version is used when testing)
def nodeVersions = ['10.22.0', "11.15.0", "12.18.3", "13.14.0", "14.7.0"]
nodeTestVersion = nodeVersions[0]

//Changing electron versions for testing requires upgrading the spectron dependency in tests/electron/package.json to a specific version.
//For more see https://www.npmjs.com/package/spectron
def electronVersions = ['8.4.1', '7.3.2']
electronTestVersion = electronVersions[0]

def gitTag = null
def formattedVersion = null
dependencies = null
objectStoreDependencies = null

environment {
  GIT_COMMITTER_NAME="ci"
  GIT_COMMITTER_EMAIL="ci@realm.io"
  ELECTRON_DISABLE_SANDBOX=1
}

// == Stages

stage('check') {
  node('docker') {
    checkout([
      $class: 'GitSCM',
      branches: scm.branches,
      gitTool: 'native git',
      extensions: scm.extensions + [
        [$class: 'WipeWorkspace'],
        [$class: 'CleanCheckout'],
        [$class: 'CloneOption', depth: 1, shallow: true, noTags: false],
        [$class: 'SubmoduleOption', recursiveSubmodules: true, shallow: true, depth: 1]
      ],
      userRemoteConfigs: scm.userRemoteConfigs
    ])
    dependencies = readProperties file: 'dependencies.list'
    objectStoreDependencies = readProperties file: 'src/object-store/dependencies.list'
    gitTag = readGitTag()
    def gitSha = readGitSha()
    def version = getVersion()
    echo "tag: ${gitTag}"
    if (gitTag == "") {
      echo "No tag given for this build"
      setBuildName("${gitSha}")
    } else {
      if (gitTag != "v${dependencies.VERSION}") {
        echo "Git tag '${gitTag}' does not match v${dependencies.VERSION}"
      } else {
        echo "Building release: '${gitTag}'"
        setBuildName("Tag ${gitTag}")
      }
    }
    echo "version: ${version}"
    stash name: 'source', includes:'**/*', excludes:'react-native/android/src/main/jni/src/object-store/.dockerignore'

    if (['master'].contains(env.BRANCH_NAME)) {
      // If we're on master, instruct the docker image builds to push to the
      // cache registry
      env.DOCKER_PUSH = "1"
    }
  }
}

stage('pretest') {
  parallelExecutors = [:]
    parallelExecutors["eslint"] = testLinux("eslint-ci Release ${nodeTestVersion}", { // "Release" is not used
    step([
      $class: 'CheckStylePublisher',
      canComputeNew: false,
      canRunOnFailed: true,
      defaultEncoding: '',
      healthy: '',
      pattern: 'eslint.xml',
      unHealthy: '',
      maxWarnings: 0,
      ignoreFailures: false])
  })
    parallelExecutors["jsdoc"] = testLinux("jsdoc Release ${nodeTestVersion}", { // "Release is not used
    publishHTML([
      allowMissing: false,
      alwaysLinkToLastBuild: false,
      keepAll: false,
      reportDir: 'docs/output',
      reportFiles: 'index.html',
      reportName: 'Docs'
    ])
  })
  parallel parallelExecutors
}

stage('build') {
    parallelExecutors = [:]
    nodeVersions.each { nodeVersion ->
      parallelExecutors["macOS Node ${nodeVersion}"] = buildMacOS { buildCommon(nodeVersion, it) }
      parallelExecutors["Linux Node ${nodeVersion}"] = buildLinux { buildCommon(nodeVersion, it) }
      parallelExecutors["Linux Rpi Node ${nodeVersion}"] = buildLinuxRpi { buildCommon(nodeVersion, it, '--arch=arm') }
      parallelExecutors["Windows Node ${nodeVersion} ia32"] = buildWindows(nodeVersion, 'ia32')
      parallelExecutors["Windows Node ${nodeVersion} x64"] = buildWindows(nodeVersion, 'x64')
    }
    electronVersions.each { electronVersion ->
      parallelExecutors["macOS Electron ${electronVersion}"]        = buildMacOS { buildElectronCommon(electronVersion, it) }
      parallelExecutors["Linux Electron ${electronVersion}"]        = buildLinux { buildElectronCommon(electronVersion, it) }
      parallelExecutors["Windows Electron ${electronVersion} ia32"] = buildWindowsElectron(electronVersion, 'ia32')
      parallelExecutors["Windows Electron ${electronVersion} x64"]  = buildWindowsElectron(electronVersion, 'x64')
    }
    parallelExecutors["Android React Native"] = buildAndroid()
    parallel parallelExecutors
}

if (gitTag) {
  stage('publish') {
    publish(nodeVersions, electronVersions, dependencies, gitTag)
  }
}

stage('test') {
  parallelExecutors = [:]

  parallelExecutors["macOS node ${nodeTestVersion} Debug"]   = testMacOS("node Debug ${nodeTestVersion}")
  parallelExecutors["macOS node ${nodeTestVersion} Release"] = testMacOS("node Release ${nodeTestVersion}")
  parallelExecutors["macOS test runners ${nodeTestVersion}"] = testMacOS("test-runners Release ${nodeTestVersion}")
  parallelExecutors["Linux node ${nodeTestVersion} Release"] = testLinux("node Release ${nodeTestVersion}", null, true)
  parallelExecutors["Linux test runners ${nodeTestVersion}"] = testLinux("test-runners Release ${nodeTestVersion}")
  parallelExecutors["Windows node ${nodeTestVersion}"] = testWindows(nodeTestVersion)


  //parallelExecutors["React Native iOS Debug"] = testMacOS('react-tests Debug')
  parallelExecutors["React Native iOS Release"] = testMacOS('react-tests Release')
  //parallelExecutors["React Native iOS Example Debug"] = testMacOS('react-example Debug')
  parallelExecutors["React Native iOS Example Release"] = testMacOS('react-example Release')
  parallelExecutors["macOS Electron Debug"] = testMacOS('electron Debug')
  parallelExecutors["macOS Electron Release"] = testMacOS('electron Release')
  //android_react_tests: testAndroid('react-tests-android', {
  //  junit 'tests/react-test-app/tests.xml'
  //}),
  parallel parallelExecutors
}

stage('integration tests') {
  parallel(
    'React Native on Android':  inAndroidContainer { reactNativeIntegrationTests('android') },
    'React Native on iOS':      buildMacOS { reactNativeIntegrationTests('ios') },
    'Electron on Mac':          buildMacOS { electronIntegrationTests(electronTestVersion, it) },
    'Electron on Linux':        buildLinux { electronIntegrationTests(electronTestVersion, it) },
    'Node.js v10 on Mac':       buildMacOS { nodeIntegrationTests(nodeTestVersion, it) },
    'Node.js v10 on Linux':     buildLinux { nodeIntegrationTests(nodeTestVersion, it) }
  )
}

// == Methods
def nodeIntegrationTests(nodeVersion, platform) {
  unstash 'source'
  unstash "pre-gyp-${platform}-${nodeVersion}"
  sh "./scripts/nvm-wrapper.sh ${nodeVersion} ./scripts/pack-with-pre-gyp.sh"

  dir('integration-tests/tests') {
    sh "../../scripts/nvm-wrapper.sh ${nodeVersion} npm ci"
  }

  dir('integration-tests') {
    // Renaming the package to avoid having to specify version in the apps package.json
    sh 'mv realm-*.tgz realm.tgz'

    // Package up the integration tests
    sh "../scripts/nvm-wrapper.sh ${nodeVersion} npm run tests/pack"
  }

  dir('integration-tests/environments/node') {
    sh "../../../scripts/nvm-wrapper.sh ${nodeVersion} npm install"
    try {
      sh "../../../scripts/nvm-wrapper.sh ${nodeVersion} npm test -- --reporter mocha-junit-reporter"
    } finally {
      junit(
        allowEmptyResults: true,
        testResults: 'test-results.xml',
      )
    }
  }
}

def electronIntegrationTests(electronVersion, platform) {
  def nodeVersion = nodeTestVersion
  unstash 'source'
  unstash "electron-pre-gyp-${platform}-${electronVersion}"
  sh "./scripts/nvm-wrapper.sh ${nodeVersion} ./scripts/pack-with-pre-gyp.sh"

  dir('integration-tests/tests') {
    sh "../../scripts/nvm-wrapper.sh ${nodeVersion} npm ci"
  }

  dir('integration-tests') {
    // Renaming the package to avoid having to specify version in the apps package.json
    sh 'mv realm-*.tgz realm.tgz'
    // Package up the integration tests
    sh "../scripts/nvm-wrapper.sh ${nodeVersion} npm run tests/pack"
  }

  // On linux we need to use xvfb to let up open GUI windows on the headless machine
  def commandPrefix = platform == 'linux' ? 'xvfb-run ' : ''

  dir('integration-tests/environments/electron') {
    sh "../../../scripts/nvm-wrapper.sh ${nodeVersion} npm install"
    try {
      sh "../../../scripts/nvm-wrapper.sh ${nodeVersion} ${commandPrefix} npm run test/main -- main-test-results.xml"
      sh "../../../scripts/nvm-wrapper.sh ${nodeVersion} ${commandPrefix} npm run test/renderer -- renderer-test-results.xml"
    } finally {
      junit(
        allowEmptyResults: true,
        testResults: '*-test-results.xml',
      )
    }
  }
}

def reactNativeIntegrationTests(targetPlatform) {
  def nodeVersion = nodeTestVersion
  unstash 'source'

  def nvm
  if (targetPlatform == "android") {
    nvm = ""
  } else {
    nvm = "${env.WORKSPACE}/scripts/nvm-wrapper.sh ${nodeVersion}"
  }

  dir('integration-tests/tests') {
    sh "${nvm} npm ci"
  }

  dir('integration-tests') {
    if (targetPlatform == "android") {
      unstash 'android'
    } else {
      // Pack up Realm JS into a .tar
      sh "${nvm} npm pack .."
    }
    // Renaming the package to avoid having to specify version in the apps package.json
    sh 'mv realm-*.tgz realm.tgz'
    // Package up the integration tests
    sh "${nvm} npm run tests/pack"
  }

  dir('integration-tests/environments/react-native') {
    sh "${nvm} npm install"

    if (targetPlatform == "android") {
      // In case the tests fail, it's nice to have an idea on the devices attached to the machine
      sh 'adb devices'
      sh 'adb wait-for-device'
      // Uninstall any other installations of this package before trying to install it again
      sh 'adb uninstall io.realm.tests.reactnative || true' // '|| true' because the app might already not be installed
    } else if (targetPlatform == "ios") {
      dir('ios') {
        sh 'pod install --verbose'
      }
    }

    timeout(30) { // minutes
      try {
        sh "${nvm} npm run test/${targetPlatform} -- --junit-output-path test-results.xml"
      } finally {
        junit(
          allowEmptyResults: true,
          testResults: 'test-results.xml',
        )
        if (targetPlatform == "android") {
          // Read out the logs in case we want some more information to debug from
          sh 'adb logcat -d -s ReactNativeJS:*'
        }
      }
    }
  }
}

def myNode(nodeSpec, block) {
  node(nodeSpec) {
    echo "Running job on ${env.NODE_NAME}"
    try {
      block.call()
    } finally {
      deleteDir()
    }
  }
}

def buildDockerEnv(name, extra_args='') {
  docker.withRegistry("https://${env.DOCKER_REGISTRY}", "ecr:eu-west-1:aws-ci-user") {
    sh "sh ./scripts/docker_build_wrapper.sh $name . ${extra_args}"
  }
  return docker.image(name)
}

def buildCommon(nodeVersion, platform, extraFlags='') {
  sshagent(credentials: ['realm-ci-ssh']) {
    sh "mkdir -p ~/.ssh"
    sh "ssh-keyscan github.com >> ~/.ssh/known_hosts"
    sh "echo \"Host github.com\n\tStrictHostKeyChecking no\n\" >> ~/.ssh/config"
    sh "./scripts/nvm-wrapper.sh ${nodeVersion} npm run package ${extraFlags}"
  }
  dir("build/stage/node-pre-gyp/${dependencies.VERSION}") {
      archiveArtifacts("realm-*")
    stash includes: 'realm-*', name: "pre-gyp-${platform}-${nodeVersion}"
  }
}

def buildElectronCommon(electronVersion, platform) {
  withEnv([
    "npm_config_target=${electronVersion}",
    "npm_config_disturl=https://atom.io/download/electron",
    "npm_config_runtime=electron",
    "npm_config_devdir=${env.HOME}/.electron-gyp"
  ]) {
    sh "./scripts/nvm-wrapper.sh ${nodeTestVersion} npm run package"
    dir("build/stage/node-pre-gyp/${dependencies.VERSION}") {
      stash includes: 'realm-*', name: "electron-pre-gyp-${platform}-${electronVersion}"
    }
  }
}

def buildLinux(workerFunction) {
  return {
    myNode('docker') {
      unstash 'source'
      def image
      withCredentials([[$class: 'StringBinding', credentialsId: 'packagecloud-sync-devel-master-token', variable: 'PACKAGECLOUD_MASTER_TOKEN']]) {
        image = buildDockerEnv('ci/realm-js:build')
      }
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
      image.inside('-e HOME=/tmp') {
        workerFunction('linux')
      }
    }
  }
}

def buildLinuxRpi(workerFunction) {
  return {
    myNode('docker') {
      unstash 'source'
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
      buildDockerEnv("realm-js:rpi", '-f armhf.Dockerfile').inside('-e HOME=/tmp') {
        withEnv(['CC=arm-linux-gnueabihf-gcc', 'CXX=arm-linux-gnueabihf-g++']) {
          workerFunction('linux-armhf')
        }
      }
    }
  }
}

def buildMacOS(workerFunction) {
  return {
    myNode('osx_vegas') {
      withEnv([
        "DEVELOPER_DIR=/Applications/Xcode-11.2.app/Contents/Developer",
      ]) {
        unstash 'source'
        sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
        workerFunction('macos')
      }
    }
  }
}

def buildWindows(nodeVersion, arch) {
  return {
    myNode('windows && nodejs') {
      unstash 'source'

      bat 'npm install --ignore-scripts --production'

      withEnv(["_MSPDBSRV_ENDPOINT_=${UUID.randomUUID().toString()}"]) {
        retry(3) {
          bat ".\\node_modules\\node-pre-gyp\\bin\\node-pre-gyp.cmd rebuild --build_v8_with_gn=false --v8_enable_pointer_compression=0 --v8_enable_31bit_smis_on_64bit_arch=0 --target_arch=${arch} --target=${nodeVersion}"
        }
      }
      bat ".\\node_modules\\node-pre-gyp\\bin\\node-pre-gyp.cmd package --build_v8_with_gn=false --v8_enable_pointer_compression=0 --v8_enable_31bit_smis_on_64bit_arch=0 --target_arch=${arch} --target=${nodeVersion}"
      dir("build/stage/node-pre-gyp/${dependencies.VERSION}") {
        stash includes: 'realm-*', name: "pre-gyp-windows-${arch}-${nodeVersion}"
      }
    }
  }
}

def buildWindowsElectron(electronVersion, arch) {
  return {
    myNode('windows && nodejs') {
      unstash 'source'
      bat 'npm install --ignore-scripts --production'
      withEnv([
        "npm_config_target=${electronVersion}",
        "npm_config_target_arch=${arch}",
        'npm_config_disturl=https://atom.io/download/electron',
        'npm_config_runtime=electron',
        "npm_config_devdir=${env.HOME}/.electron-gyp"
      ]) {
        withEnv(["_MSPDBSRV_ENDPOINT_=${UUID.randomUUID().toString()}"]) {
          bat '.\\node_modules\\node-pre-gyp\\bin\\node-pre-gyp.cmd rebuild --realm_enable_sync'
        }
        bat '.\\node_modules\\node-pre-gyp\\bin\\node-pre-gyp.cmd package'
      }
      dir("build/stage/node-pre-gyp/${dependencies.VERSION}") {
        stash includes: 'realm-*', name: "electron-pre-gyp-windows-${arch}-${electronVersion}"
      }
    }
  }
}


def inAndroidContainer(workerFunction) {
  return {
    myNode('android') {
      unstash 'source'
      def image
      withCredentials([[$class: 'StringBinding', credentialsId: 'packagecloud-sync-devel-master-token', variable: 'PACKAGECLOUD_MASTER_TOKEN']]) {
        image = buildDockerEnv('ci/realm-js:android-build', '-f Dockerfile.android')
      }
      
      // Locking on the "android" lock to prevent concurrent usage of the gradle-cache
      // @see https://github.com/realm/realm-java/blob/00698d1/Jenkinsfile#L65
      lock("${env.NODE_NAME}-android") {
        image.inside(
          // Mounting ~/.android/adbkey(.pub) to reuse the adb keys
          "-v ${HOME}/.android/adbkey:/home/jenkins/.android/adbkey:ro -v ${HOME}/.android/adbkey.pub:/home/jenkins/.android/adbkey.pub:ro " +
          // Mounting ~/gradle-cache as ~/.gradle to prevent gradle from being redownloaded
          "-v ${HOME}/gradle-cache:/home/jenkins/.gradle " +
          // Mounting ~/ccache as ~/.ccache to reuse the cache across builds
          "-v ${HOME}/ccache:/home/jenkins/.ccache " +
          // Mounting /dev/bus/usb with --privileged to allow connecting to the device via USB
          "-v /dev/bus/usb:/dev/bus/usb --privileged"
        ) {
          workerFunction()
        }
      }
    }
  }
}

def buildAndroid() {
  inAndroidContainer {
    sh 'npm ci --ignore-scripts'
    sh 'cd react-native/android && ./gradlew publishAndroid'
    sh 'npm pack'
    stash includes: 'realm-*.tgz', name: 'android'
  }
}

def publish(nodeVersions, electronVersions, dependencies, tag) {
  myNode('docker') {
    for (def platform in ['macos', 'linux', 'windows-ia32', 'windows-x64']) {
      for (def version in nodeVersions) {
        unstash "pre-gyp-${platform}-${version}"
      }
      for (def version in electronVersions) {
        unstash "electron-pre-gyp-${platform}-${version}"
      }
    }
    for (def version in nodeVersions) {
      unstash "pre-gyp-linux-armhf-${version}"
    }

    withCredentials([[$class: 'FileBinding', credentialsId: 'c0cc8f9e-c3f1-4e22-b22f-6568392e26ae', variable: 's3cfg_config_file']]) {
      sh "s3cmd -c \$s3cfg_config_file put --multipart-chunk-size-mb 5 realm-* 's3://static.realm.io/node-pre-gyp/${dependencies.VERSION}/'"
    }
  }
}


def readGitTag() {
  return sh(returnStdout: true, script: 'git describe --exact-match --tags HEAD || echo ""').readLines().last().trim()
}

def readGitSha() {
  return sh(returnStdout: true, script: 'git rev-parse --short HEAD').readLines().last().trim()
}

def getVersion() {
  def dependencies = readProperties file: 'dependencies.list'
  if (readGitTag() == "") {
    return "${dependencies.VERSION}-g${readGitSha()}"
  }
  else {
    return dependencies.VERSION
  }
}

def setBuildName(newBuildName) {
  currentBuild.displayName = "${currentBuild.displayName} - ${newBuildName}"
}

def reportStatus(target, state, String message) {
  echo "Reporting Status ${state} to GitHub: ${message}"
  if (message && message.length() > 140) {
    message = message.take(137) + '...' // GitHub API only allows for 140 characters
  }
  try {
    step([
      $class: 'GitHubCommitStatusSetter',
      contextSource: [$class: 'ManuallyEnteredCommitContextSource', context: target],
      statusResultSource: [$class: 'ConditionalStatusResultSource', results: [[
        $class: 'AnyBuildResult', message: message, state: state]]
      ],
      reposSource: [$class: 'ManuallyEnteredRepositorySource', url: 'https://github.com/realm/realm-js']
    ])
  } catch(Exception err) {
    echo "Error posting to GitHub: ${err}"
  }
}

def doInside(script, target, postStep = null) {
  try {
    reportStatus(target, 'PENDING', 'Build has started')

    retry(3) { // retry unstash up to three times to mitigate network and contention
      dir(env.WORKSPACE) {
        deleteDir()
        unstash 'source'
      }
    }
    wrap([$class: 'AnsiColorBuildWrapper']) {
        timeout(time: 1, unit: 'HOURS') {
          sh "bash ${script} ${target}"
        }
    }
    if (postStep) {
       postStep.call()
    }
    dir(env.WORKSPACE) {
      deleteDir() // solving realm/realm-js#734
    }
    reportStatus(target, 'SUCCESS', 'Success!')
  } catch(Exception e) {
    reportStatus(target, 'FAILURE', e.toString())
    currentBuild.rawBuild.setResult(Result.FAILURE)
    e.printStackTrace()
    throw e
  }
}

def doDockerInside(script, target, postStep = null) {
  docker.withRegistry("https://${env.DOCKER_REGISTRY}", "ecr:eu-west-1:aws-ci-user") {
    doInside(script, target, postStep)
  }
}

def testAndroid(target, postStep = null) {
  return {
    node('android') {
        timeout(time: 1, unit: 'HOURS') {
            doDockerInside('./scripts/docker-android-wrapper.sh ./scripts/test.sh', target, postStep)
        }
    }
  }
}

def testLinux(target, postStep = null, Boolean enableSync = false) {
  return {
      node('docker') {
      def reportName = "Linux ${target}"
      deleteDir()
      unstash 'source'
      def image
      withCredentials([[$class: 'StringBinding', credentialsId: 'packagecloud-sync-devel-master-token', variable: 'PACKAGECLOUD_MASTER_TOKEN']]) {
        image = buildDockerEnv('ci/realm-js:build')
      }
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"

      def buildSteps = { String dockerArgs = "" ->
          image.inside("-e HOME=/tmp ${dockerArgs}") {
            if (enableSync) {
                // check the network connection to local mongodb before continuing to compile everything
                sh "curl http://mongodb-realm:9090"
            }
            timeout(time: 1, unit: 'HOURS') {
              sh "scripts/test.sh ${target}"
            }
            if (postStep) {
              postStep.call()
            }
            deleteDir()
            reportStatus(reportName, 'SUCCESS', 'Success!')
          }
      }

      try {
          reportStatus(reportName, 'PENDING', 'Build has started')
          if (enableSync) {
              // stitch images are auto-published every day to our CI
              // see https://github.com/realm/ci/tree/master/realm/docker/mongodb-realm
              // we refrain from using "latest" here to optimise docker pull cost due to a new image being built every day
              // if there's really a new feature you need from the latest stitch, upgrade this manually
            withRealmCloud(version: objectStoreDependencies.MDBREALM_TEST_SERVER_TAG, appsToImport: ['auth-integration-tests': "${env.WORKSPACE}/src/object-store/tests/mongodb"]) { networkName ->
                buildSteps("-e MONGODB_REALM_ENDPOINT=\"http://mongodb-realm\" --network=${networkName}")
            }
          } else {
            buildSteps("")
          }
        } catch(Exception e) {
          reportStatus(reportName, 'FAILURE', e.toString())
          throw e
      }
    }
  }
}

def testMacOS(target, postStep = null) {
  return {
    node('osx_vegas') {
      withEnv(['DEVELOPER_DIR=/Applications/Xcode-11.2.app/Contents/Developer',
               'REALM_SET_NVM_ALIAS=1',
               'REALM_DISABLE_SYNC_TESTS=1']) {
        doInside('./scripts/test.sh', target, postStep)
      }
    }
  }
}

def testWindows(nodeVersion) {
  return {
    node('windows && nodist') {
      unstash 'source'
      bat "nodist add ${nodeVersion}"
      try {
        withEnv(["NODE_NODIST_VERSION=${nodeVersion}"]) {
          bat 'npm install --build-from-source=realm --realm_enable_sync'
          dir('tests') {
            bat 'npm install'
            bat 'npm run test'
            junit 'junitresults-*.xml'
          }
        }
      } finally {
        deleteDir()
      }
    }
  }
}
