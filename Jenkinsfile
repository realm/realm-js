#!groovy
import groovy.json.JsonOutput

@Library('realm-ci') _
repoName = 'realm-js'

platforms = ['win32-ia32', 'win32-x64', 'darwin-x64', 'darwin-arm64', 'linux-x64', 'linux-arm']
nodeTestVersion = '12.22.5'

//Changing electron versions for testing requires upgrading the spectron dependency in tests/electron/package.json to a specific version.
//For more see https://www.npmjs.com/package/spectron
electronTestVersion = '8.4.1'

def gitTag = null
def formattedVersion = null
dependencies = null
coreDependencies = null

def skipBuild = null

def exclusivelyChanged(patterns) {
  // Checks if this is a change/pull request and if the files changed exclusively match the provided regular expression
  def regexp = patterns.join('|')
  return env.CHANGE_TARGET && sh(
    returnStatus: true,
    script: "git diff origin/$CHANGE_TARGET --name-only | grep -E --invert-match '${regexp}'"
  ) != 0
}

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

    // Abort early if files didn't change outside of specific locations,
    // since these will has been migrated to GitHub actions.
    skipBuild = exclusivelyChanged(['^\\.github/', '^packages/', '^integration-tests/', '\\.md$'])
    if (skipBuild) {
      currentBuild.result = 'SUCCESS'
      echo 'Stopped since there were only changes to files that are uninteresting or already being tested using GitHub Actions'
      return
    }

    dependencies = readProperties file: 'dependencies.list'
    coreDependencies = readProperties file: 'vendor/realm-core/dependencies.list'
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

// Ensure no other stages are executed
if (skipBuild) {
  return
}

stage('build') {
    parallelExecutors = [:]
    parallelExecutors["OS x86_64 NAPI ${nodeTestVersion}"] = buildMacOS { buildCommon(nodeTestVersion, it) }
    parallelExecutors["macOS arm NAPI ${nodeTestVersion}"] = buildMacOSArm { buildCommon(nodeTestVersion, it, '-- --arch=arm64') }

    parallelExecutors["Linux x86_64 NAPI ${nodeTestVersion}"] = buildLinux { buildCommon(nodeTestVersion, it) }
    parallelExecutors["Linux armhf NAPI ${nodeTestVersion}"] = buildLinuxRpi { buildCommon(nodeTestVersion, it, '-- --arch=arm -- --CDCMAKE_TOOLCHAIN_FILE=./vendor/realm-core/tools/cmake/armhf.toolchain.cmake') }
    parallelExecutors["Windows ia32 NAPI ${nodeTestVersion}"] = buildWindows(nodeTestVersion, 'ia32')
    parallelExecutors["Windows x64 NAPI ${nodeTestVersion}"] = buildWindows(nodeTestVersion, 'x64')

    parallelExecutors["Android RN"] = buildAndroid()
    parallelExecutors["iOS RN"] = buildiOS()

    parallel parallelExecutors
}

stage('pretest') {
  parallelExecutors = [:]
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

if (gitTag) {
  stage('publish') {
    publish(dependencies, gitTag)
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

  parallelExecutors["React Native Android Release"] = inAndroidContainer { testAndroid('test-android') }
  parallelExecutors["React Native iOS Release"] = testMacOS('react-tests Release')
  parallelExecutors["React Native Catalyst Release"] = testMacOS('catalyst-tests Release')
  parallelExecutors["React Native iOS Example Release"] = testMacOS('react-example Release')

  parallelExecutors["macOS Electron Debug"] = testMacOS('electron Debug')
  parallelExecutors["macOS Electron Release"] = testMacOS('electron Release')
  parallel parallelExecutors
}

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

def buildDockerEnv(name, extra_args='') {
  docker.withRegistry("https://${env.DOCKER_REGISTRY}", "ecr:eu-west-1:aws-ci-user") {
    sh "sh ./scripts/docker_build_wrapper.sh $name . ${extra_args}"
  }
  return docker.image(name)
}

def buildCommon(nodeVersion, platform, extraFlags='') {
  sh "./scripts/nvm-wrapper.sh ${nodeVersion} npm run package ${extraFlags}"

  dir('prebuilds') {
    // Uncomment this when testing build changes if you want to be able to download pre-built artifacts from Jenkins.
    // archiveArtifacts("realm-*")
    stash includes: "realm-v${dependencies.VERSION}-napi-v${dependencies.NAPI_VERSION}-${platform}*.tar.gz", name: "prebuild-${platform}"
  }
}

def buildLinux(workerFunction) {
  return {
    myNode('docker') {
      unstash 'source'
      def image = buildDockerEnv('ci/realm-js:build')
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
      image.inside('-e HOME=/tmp') {
        workerFunction('linux-x64')
      }
    }
  }
}

def buildLinuxRpi(workerFunction) {
  return {
    myNode('docker') {
      unstash 'source'
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
      buildDockerEnv("ci/realm-js:rpi", '-f armhf.Dockerfile').inside('-e HOME=/tmp') {
        workerFunction('linux-arm')
      }
    }
  }
}

def buildMacOS(workerFunction) {
  return {
    myNode('osx_vegas') {
      withEnv([
        "DEVELOPER_DIR=/Applications/Xcode-12.2.app/Contents/Developer",
      ]) {
        unstash 'source'
        sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
        workerFunction('darwin-x64')
      }
    }
  }
}

def buildMacOSArm(workerFunction) {
  return {
    myNode('osx_vegas') {
      withEnv([
        "DEVELOPER_DIR=/Applications/Xcode-12.2.app/Contents/Developer",
        "NODE_ARCH_ARM=1",
      ]) {
        unstash 'source'
        sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
        workerFunction('darwin-arm64')
      }
    }
  }
}


def buildWindows(nodeVersion, arch) {
  return {
    myNode('windows && nodejs') {
      unstash 'source'

      withEnv([
        "_MSPDBSRV_ENDPOINT_=${UUID.randomUUID().toString()}",
        "PATH+CMAKE=${tool 'cmake'}\\.."
        ]) {
        bat "npm run package -- --arch=${arch}"
      }

      dir('prebuilds') {
        // Uncomment this when testing build changes if you want to be able to download pre-built artifacts from Jenkins.
        // archiveArtifacts("realm-*")
        stash includes: "realm-v${dependencies.VERSION}-napi-v${dependencies.NAPI_VERSION}-win32-${arch}*.tar.gz", name: "prebuild-win32-${arch}"
      }
    }
  }
}

def buildiOS() {
  return buildMacOS {
    sh './scripts/build-iOS.sh -c Release'
      dir('react-native/ios') {
      // Uncomment this when testing build changes if you want to be able to download pre-built artifacts from Jenkins.
      // archiveArtifacts('realm-js-ios.xcframework/**')
      stash includes: 'realm-js-ios.xcframework/**', name: 'realm-js-ios.xcframework'
    }
  }
}

def inAndroidContainer(workerFunction) {
  return {
    myNode('docker-cph-03') {
      unstash 'source'
      def image
      withCredentials([[$class: 'StringBinding', credentialsId: 'packagecloud-sync-devel-master-token', variable: 'PACKAGECLOUD_MASTER_TOKEN']]) {
        image = buildDockerEnv('ci/realm-js:android-build', '-f Dockerfile.android')
      }

      // Locking prevent concurrent usage of the gradle-cache
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
  return {
    myNode('docker') {
      unstash 'source'
      def image = buildDockerEnv('ci/realm-js:android-build', '-f Dockerfile.android')
      image.inside('-e HOME=/tmp') {
        // Using --ignore-scripts to skip building for node
        sh "./scripts/nvm-wrapper.sh ${nodeTestVersion} npm ci --ignore-scripts"
        sh "./scripts/nvm-wrapper.sh ${nodeTestVersion} node scripts/build-android.js"
      }
      dir('react-native/android/src/main') {
        // Uncomment this when testing build changes if you want to be able to download pre-built artifacts from Jenkins.
        // archiveArtifacts('jniLibs/**')
        stash includes: 'jniLibs/**', name: 'android-jnilibs'
      }
    }
  }
}

def publish(dependencies, tag) {
  myNode('docker') {

    for (def platform in platforms) {
      unstash "prebuild-${platform}"
    }

    withCredentials([[$class: 'FileBinding', credentialsId: 'c0cc8f9e-c3f1-4e22-b22f-6568392e26ae', variable: 's3cfg_config_file']]) {
      sh "s3cmd -c \$s3cfg_config_file put --multipart-chunk-size-mb 5 realm-* 's3://static.realm.io/realm-js-prebuilds/${dependencies.VERSION}/'"
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
    dir('prebuilds') {
      unstash 'prebuild-darwin-x64'
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

def runEmulator() {
  sh """yes '\n' | avdmanager create avd -n CIRJSEmulator -k 'system-images;android-29;default;x86' --force"""
  sh "adb start-server" // https://stackoverflow.com/questions/56198290/problems-with-adb-exe
  // Need to go to ANDROID_HOME due to https://askubuntu.com/questions/1005944/emulator-avd-does-not-launch-the-virtual-device
  sh "cd \$ANDROID_HOME/tools && emulator -avd CIRJSEmulator -no-boot-anim -no-window -wipe-data -noaudio -partition-size 4098 -gpu swiftshader_indirect &"
  echo "Waiting for the emulator to be available"
  sh 'adb wait-for-device'
  sh 'adb devices'
}

def testAndroid(target, postStep = null) {
  timeout(30) {
    runEmulator();
    try {
      sh "./scripts/test.sh ${target}"
    } finally {
      sh "adb emu kill"
      if (postStep) {
        postStep.call()
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
      def image = buildDockerEnv('ci/realm-js:build')
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"

      def buildSteps = { String dockerArgs = "" ->
          image.inside("-e HOME=/tmp ${dockerArgs}") {
            withEnv(['npm_config_realm_local_prebuilds=prebuilds']) {
              if (enableSync) {
                  // check the network connection to local mongodb before continuing to compile everything
                  sh "curl http://mongodb-realm:9090"
              }
              dir('prebuilds') {
                unstash 'prebuild-linux-x64'
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
      }

      try {
          reportStatus(reportName, 'PENDING', 'Build has started')
          if (enableSync) {
              // stitch images are auto-published every day to our CI
              // see https://github.com/realm/ci/tree/master/realm/docker/mongodb-realm
              // we refrain from using "latest" here to optimise docker pull cost due to a new image being built every day
              // if there's really a new feature you need from the latest stitch, upgrade this manually
            withRealmCloud(version: dependencies.MDBREALM_TEST_SERVER_TAG, appsToImport: [
              'auth-integration-tests': "${env.WORKSPACE}/tests/mongodb/common-tests",
              'pv-int-tests':           "${env.WORKSPACE}/tests/mongodb/pv-int-tests",
              'pv-string-tests':        "${env.WORKSPACE}/tests/mongodb/pv-string-tests",
              'pv-objectid-tests':      "${env.WORKSPACE}/tests/mongodb/pv-objectid-tests",
              'pv-uuid-tests':          "${env.WORKSPACE}/tests/mongodb/pv-uuid-tests"
              ]) { networkName ->
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
      withEnv(['DEVELOPER_DIR=/Applications/Xcode-12.2.app/Contents/Developer',
               'REALM_SET_NVM_ALIAS=1',
               'REALM_DISABLE_SYNC_TESTS=1',
               'npm_config_realm_local_prebuilds=prebuilds']) {
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
        withEnv([
          "NODE_NODIST_VERSION=${nodeVersion}",
          "PATH+CMAKE=${tool 'cmake'}\\..",
        ]) {
          // FIXME: remove debug option when the Release builds are working again
          bat '''
            npm install --ignore-scripts
            npm run build -- --debug
          '''
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
