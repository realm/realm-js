#!groovy
import groovy.json.JsonOutput

@Library('realm-ci') _
repoName = 'realm-js' // This is a global variable

def nodeVersions = ['8.15.0', '10.15.1']
def electronVersions = ['2.0.18', '3.0.16', '3.1.8', '4.0.8', '4.1.4']
def nodeTestVersion = '8.15.0'
def gitTag = null
def formattedVersion = null
dependencies = null

// def ElectronTests
// def NodeJsTests
// def ReactNativeTests

// == Stages

stage('check') {
  node('docker && !aws') {
    checkout([
      $class: 'GitSCM',
      branches: scm.branches,
      gitTool: 'native git',
      extensions: scm.extensions + [
        [$class: 'WipeWorkspace'],
        [$class: 'CleanCheckout'],
        [$class: 'CloneOption', depth: 0, shallow: false, noTags: false],
        [$class: 'SubmoduleOption', recursiveSubmodules: true]
      ],
      userRemoteConfigs: scm.userRemoteConfigs
    ])
    dependencies = readProperties file: 'dependencies.list'
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
    stash name: 'realm-js-source', includes:'**/*', excludes:'react-native/android/src/main/jni/src/object-store/.dockerignore'

    if (['master'].contains(env.BRANCH_NAME)) {
      // If we're on master, instruct the docker image builds to push to the
      // cache registry
      env.DOCKER_PUSH = "1"
    }

    // Load the integration tests groovy scripts
    ElectronTests = load 'integration-tests/environments/electron/jenkins.groovy'
    NodeJsTests = load 'integration-tests/environments/node/jenkins.groovy'
    ReactNativeTests = load 'integration-tests/environments/react-native/jenkins.groovy'
  }
}

stage('test') {
  parallelExecutors = [:]
  parallelExecutors["eslint"] = doDockerBuild('eslint-ci', 10, {
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
  parallelExecutors["jsdoc"] = doDockerBuild('jsdoc', 10, {
    publishHTML([
      allowMissing: false,
      alwaysLinkToLastBuild: false,
      keepAll: false,
      reportDir: 'docs/output',
      reportFiles: 'index.html',
      reportName: 'Docs'
    ])
  })
  for (def nodeVersion in nodeVersions) {
    parallelExecutors["macOS node ${nodeVersion} Debug"]   = doMacBuild("node Debug ${nodeVersion}")
    parallelExecutors["macOS node ${nodeVersion} Release"] = doMacBuild("node Release ${nodeVersion}")
    parallelExecutors["Linux node ${nodeVersion} Debug"]   = doDockerBuild("node Debug ${nodeVersion}", nodeVersion)
    parallelExecutors["Linux node ${nodeVersion} Release"] = doDockerBuild("node Release ${nodeVersion}", nodeVersion)
    parallelExecutors["Linux test runners ${nodeVersion}"] = doDockerBuild('test-runners', nodeVersion)
  }
  parallelExecutors["React Native iOS Debug"] = doMacBuild('react-tests Debug')
  parallelExecutors["React Native iOS Release"] = doMacBuild('react-tests Release')
  parallelExecutors["React Native iOS Example Debug"] = doMacBuild('react-example Debug')
  parallelExecutors["React Native iOS Example Release"] = doMacBuild('react-example Release')
  parallelExecutors["macOS Electron Debug"] = doMacBuild('electron Debug')
  parallelExecutors["macOS Electron Release"] = doMacBuild('electron Release')
  parallelExecutors["Windows node"] = doWindowsBuild()
  //android_react_tests: doAndroidBuild('react-tests-android', {
  //  junit 'tests/react-test-app/tests.xml'
  //}),
  parallel parallelExecutors
}

/*
stage('build') {
  parallelExecutors = [:]
  for (def nodeVersion in nodeVersions) {
    parallelExecutors["Mac Node ${nodeVersion}"]   = { buildMacOS(nodeVersion, this.&buildCommon) }
    parallelExecutors["Linux Node ${nodeVersion}"] = { buildLinux(nodeVersion, this.&buildCommon) }
  }
  for (def electronVersion in electronVersions) {
    parallelExecutors["Mac Electron ${electronVersion}"]          = { buildMacOS(electronVersion, this.&buildElectronCommon) }
    parallelExecutors["Linux Electron ${electronVersion}"]        = { buildLinux(electronVersion, this.&buildElectronCommon) }
    parallelExecutors["Windows Electron ${electronVersion} ia32"] = { buildWindowsElectron(electronVersion, 'ia32') }
    parallelExecutors["Windows Electron ${electronVersion} x64"]  = { buildWindowsElectron(electronVersion, 'x64') }
  }
  parallel parallelExecutors
}

stage('integration tests') {
  parallel(
    'React Native on Android': ReactNativeTests.onAndroid(),
    'React Native on iOS': ReactNativeTests.onIOS(),
    'Node.js v10 on Mac': NodeJsTests.onMacOS(nodeVersion: '10'),
    'Node.js v8 on Linux': NodeJsTests.onLinux(nodeVersion: '8'),
    'Node.js v10 on Linux': NodeJsTests.onLinux(nodeVersion: '10'),
    // 'Electron on Linux': ElectronTests.onLinux(),
    'Electron on Mac': ElectronTests.onMacOS(),
  )
}

if (gitTag) {
  stage('publish') {
    publish(nodeVersions, dependencies, gitTag)
  }
}
*/

// == Methods

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

def buildDockerEnv(name, dockerfile='Dockerfile', extra_args='') {
  docker.withRegistry("https://${env.DOCKER_REGISTRY}", "ecr:eu-west-1:aws-ci-user") {
    sh "sh ./scripts/docker_build_wrapper.sh $name . ${extra_args}"
  }
  return docker.image(name)
}

def buildCommon(nodeVersion, platform) {
  sshagent(credentials: ['realm-ci-ssh']) {
    sh "mkdir -p ~/.ssh"
    sh "ssh-keyscan github.com >> ~/.ssh/known_hosts"
    sh "echo \"Host github.com\n\tStrictHostKeyChecking no\n\" >> ~/.ssh/config"
    sh "./scripts/nvm-wrapper.sh ${nodeVersion} npm run package"
  }
  dir("build/stage/node-pre-gyp/${dependencies.VERSION}") {
    stash includes: 'realm-*', name: "pre-gyp-${platform}-${nodeVersion}"
  }
}

def buildElectronCommon(electronVersion, platform) {
  sh "${env.WORKSPACE}/scripts/build-electron.sh ${electronVersion} ${nodeTestVersion}"
  dir("build/stage/node-pre-gyp/${dependencies.VERSION}") {
    stash includes: 'realm-*', name: "electron-pre-gyp-${platform}-${electronVersion}"
  }
}

def buildLinux(nodeVersion, workerFunction, variant = "Release") {
  myNode('docker') {
    unstash 'realm-js-source'
    def image
    withCredentials([[$class: 'StringBinding', credentialsId: 'packagecloud-sync-devel-master-token', variable: 'PACKAGECLOUD_MASTER_TOKEN']]) {
      image = buildDockerEnv('ci/realm-js-private:build', 'Dockerfile')
    }
    sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
    image.inside('-e HOME=/tmp') {
      workerFunction(nodeVersion, 'linux', variant)
    }
  }
}

def buildMacOS(nodeVersion, workerFunction, variant = "Release") {
  myNode('osx_vegas') {
    env.DEVELOPER_DIR = "/Applications/Xcode-9.4.app/Contents/Developer"
    unstash 'realm-js-source'
    sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
    workerFunction(nodeVersion, 'macos', variant)
  }
}

def buildWindows(nodeVersion, arch) {
  myNode('windows && nodejs && cph-windows-01') {
    unstash 'realm-js-source'

    bat 'npm install --ignore-scripts --production'

    withEnv(["_MSPDBSRV_ENDPOINT_=${UUID.randomUUID().toString()}"]) {
      retry(3) {
        bat ".\\node_modules\\node-pre-gyp\\bin\\node-pre-gyp.cmd rebuild --build_v8_with_gn=false --target_arch=${arch} --target=${nodeVersion}"
      }
    }
    bat ".\\node_modules\\node-pre-gyp\\bin\\node-pre-gyp.cmd package --build_v8_with_gn=false --target_arch=${arch} --target=${nodeVersion}"
    dir("build/stage/node-pre-gyp/${dependencies.VERSION}") {
      stash includes: 'realm-*', name: "pre-gyp-windows-${arch}-${nodeVersion}"
    }
  }
}

def buildWindowsElectron(electronVersion, arch) {
  myNode('windows && nodejs && cph-windows-01') {
    unstash 'realm-js-source'
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

def testNode(nodeVersion, platform, variant) {
  withCredentials([string(credentialsId: 'realm-sync-feature-token-enterprise', variable: 'realmFeatureToken')]) {
    sh "REALM_FEATURE_TOKEN=${realmFeatureToken} SYNC_WORKER_FEATURE_TOKEN=${realmFeatureToken} ./scripts/nvm-wrapper.sh ${nodeVersion} scripts/test.sh node ${variant} ${nodeVersion}"
    junit allowEmptyResults: true, keepLongStdio: true, testResults: "results.xml"
  }
}

def publish(nodeVersions, dependencies, tag) {
  myNode('docker') {
    for (def platform in ['macos', 'linux', 'windows-ia32', 'windows-x64']) {
      for (def version in nodeVersions) {
        unstash "pre-gyp-${platform}-${version}"
      }
    }

    for (def platform in ['macos', 'linux', 'windows-ia32', 'windows-x64']) {
      for (def version in electronVersions) {
        unstash "electron-pre-gyp-${platform}-${version}"
      }
    }

    withCredentials([[$class: 'FileBinding', credentialsId: 'c0cc8f9e-c3f1-4e22-b22f-6568392e26ae', variable: 's3cfg_config_file']]) {
      sh "s3cmd -c \$s3cfg_config_file put --multipart-chunk-size-mb 5 realm-* 's3://static.realm.io/node-pre-gyp/${formattedVersion}/'"
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
        unstash 'realm-js-source'
      }
    }
    wrap([$class: 'AnsiColorBuildWrapper']) {
      withCredentials([string(credentialsId: 'realm-sync-feature-token-enterprise', variable: 'realmFeatureToken')]) {
        sh "SYNC_WORKER_FEATURE_TOKEN=${realmFeatureToken} bash ${script} ${target}"
      }
    }
    if(postStep) {
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

def doAndroidBuild(target, postStep = null) {
  return {
    node('docker && android && !aws') {
        timeout(time: 1, unit: 'HOURS') {
            doDockerInside('./scripts/docker-android-wrapper.sh ./scripts/test.sh', target, postStep)
        }
    }
  }
}

def doDockerBuild(target, nodeVersion = 10, postStep = null) {
  return {
    node('docker') {
      deleteDir()
      unstash 'realm-js-source'
      def image
      withCredentials([[$class: 'StringBinding', credentialsId: 'packagecloud-sync-devel-master-token', variable: 'PACKAGECLOUD_MASTER_TOKEN']]) {
        image = buildDockerEnv('ci/realm-js:build', 'Dockerfile')
      }
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"

      try {
        reportStatus(target, 'PENDING', 'Build has started')
        image.inside('-e HOME=/tmp') {
          withCredentials([string(credentialsId: 'realm-sync-feature-token-enterprise', variable: 'realmFeatureToken')]) {
            sh "REALM_FEATURE_TOKEN=${realmFeatureToken} SYNC_WORKER_FEATURE_TOKEN=${realmFeatureToken} scripts/test.sh ${target} ${nodeVersion}"
          }
          if(postStep) {
            postStep.call()
          }
          deleteDir()
          reportStatus(target, 'SUCCESS', 'Success!')
        }
      } catch(Exception e) {
        reportStatus(target, 'FAILURE', e.toString())
        throw e
      }
    }
  }
}

def doMacBuild(target, postStep = null) {
  return {
    node('osx_vegas') {
      withEnv(['DEVELOPER_DIR=/Applications/Xcode-9.4.app/Contents/Developer',
               'SDKROOT=macosx10.13',
               'REALM_SET_NVM_ALIAS=1']) {
        doInside('./scripts/test.sh', target, postStep)
      }
    }
  }
}

def doWindowsBuild() {
  return {
    node('windows && nodejs') {
      unstash 'realm-js-source'
      try {
        bat 'npm install --build-from-source=realm --realm_enable_sync'
        dir('tests') {
          bat 'npm install'
          bat 'npm run test'
          junit 'junitresults-*.xml'
        }
      } finally {
        deleteDir()
      }
    }
  }
}

def packageNpmArchive() {
  return {
    node('docker && !aws') {
      // Unstash the files in the repository
      unstash 'realm-js-source'
      // Remove any archive from the workspace, which might have been produced by previous runs of the job
      sh 'rm -f realm-*.tgz'
      // TODO: Consider moving the node on the other side of the stages
      docker.build(
        'ci/realm-js:android-build',
        '-f Dockerfile.android .'
      ).inside {
        // Install dependencies
        sh 'npm install'
        // Publish the Android module
        sh 'cd react-native/android && ./gradlew publishAndroid'
        // Package up the app
        sh 'npm pack'
        // Archive and stash the package
        archiveArtifacts 'realm-*.tgz'
        stash includes: 'realm-*.tgz', name: 'package'
      }
    }
  }
}
