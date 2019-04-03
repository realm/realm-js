#!groovy
import groovy.json.JsonOutput

@Library('realm-ci') _

repoName = 'realm-js' // This is a global variable

def gitTag
def gitSha
def dependencies
def version

def ElectronTests
def NodeJsTests
def ReactNativeTests

// == Stages

stage('check') {
  node('docker && !aws') {
    // - checkout the source
    checkout([
      $class: 'GitSCM',
      branches: scm.branches,
      gitTool: 'native git',
      extensions: scm.extensions + [
        [$class: 'WipeWorkspace'],
        [$class: 'CleanCheckout'],
        [$class: 'SubmoduleOption', recursiveSubmodules: true]
      ],
      userRemoteConfigs: scm.userRemoteConfigs
    ])

    stash name: 'source', includes:'**/*', excludes:'react-native/android/src/main/jni/src/object-store/.dockerignore'

    dependencies = readProperties file: 'dependencies.list'

    gitTag = readGitTag()
    gitSha = readGitSha()
    version = getVersion()
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

stage('package and test') {
  parallel(
    eslint: doDockerBuild('eslint-ci', 10, {
      step([$class: 'CheckStylePublisher', canComputeNew: false, canRunOnFailed: true, defaultEncoding: '', healthy: '', pattern: 'eslint.xml', unHealthy: ''])
    }),
    jsdoc: doDockerBuild('jsdoc', 10, {
      publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: false, reportDir: 'docs/output', reportFiles: 'index.html', reportName: 'Docs'])
    }),
    linux_node_8_debug: doDockerBuild('node Debug v8.15.0', 8),
    linux_node_8_release: doDockerBuild('node Release v8.15.0', 8),
    linux_node_10_debug: doDockerBuild('node Debug v10.15.1', 10),
    linux_node_10_release: doDockerBuild('node Release v10.15.1', 10),
    linux_test_runners: doDockerBuild('test-runners'),
    macos_node_debug: doMacBuild('node Debug'),
    macos_node_release: doMacBuild('node Release'),
    macos_react_tests_debug: doMacBuild('react-tests Debug'),
    macos_react_tests_release: doMacBuild('react-tests Release'),
    macos_react_example_debug: doMacBuild('react-example Debug'),
    macos_react_example_release: doMacBuild('react-example Release'),
    macos_electron_debug: doMacBuild('electron Debug'),
    macos_electron_release: doMacBuild('electron Release'),
    //android_react_tests: doAndroidBuild('react-tests-android', {
    //  junit 'tests/react-test-app/tests.xml'
    //}),
    windows_node: doWindowsBuild(),
    package: packageNpmArchive(),
  )
}

stage('integration tests') {
  parallel(
    // Integration tests:
    // The tests above should be removed once we manage to move them to the new test harness in ./integration-tests
    'React Native on Android': ReactNativeTests.onAndroid(),
    'React Native on iOS': ReactNativeTests.onIOS(),
    'Node.js v10 on Mac': NodeJsTests.onMacOS(nodeVersion: '10'),
    'Node.js v8 on Linux': NodeJsTests.onLinux(nodeVersion: '8'),
    'Node.js v10 on Linux': NodeJsTests.onLinux(nodeVersion: '10'),
    // 'Electron on Linux': ElectronTests.onLinux(),
    'Electron on Mac': ElectronTests.onMacOS(),
  )
}

// == Methods

def readGitTag() {
  sh "git describe --exact-match --tags HEAD | tail -n 1 > tag.txt 2>&1 || true"
  def tag = readFile('tag.txt').trim()
  return tag
}

def readGitSha() {
  sh "git rev-parse HEAD | cut -b1-8 > sha.txt"
  def sha = readFile('sha.txt').readLines().last().trim()
  return sha
}

def getVersion(){
  def dependencies = readProperties file: 'dependencies.list'
  def gitTag = readGitTag()
  def gitSha = readGitSha()
  if (gitTag == "") {
    return "${dependencies.VERSION}-g${gitSha}"
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
            doDockerInside("./scripts/docker-android-wrapper.sh ./scripts/test.sh", target, postStep)
        }
    }
  }
}

def doDockerBuild(target, nodeVersion = 10, postStep = null) {
  return {
    node('docker && !aws') {
      deleteDir()
      unstash 'source'

      try {
        reportStatus(target, 'PENDING', 'Build has started')

        // We use the bitnami/node image since it comes with GCC 6.3
        docker.image("bitnami/node:${nodeVersion}").inside('-e HOME=/tmp') {
          sh "scripts/test.sh ${target}"
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
        doInside("./scripts/test.sh", target, postStep)
      }
    }
  }
}

def doWindowsBuild() {
  return {
    node('windows && nodejs') {
      unstash 'source'
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
      unstash 'source'
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
