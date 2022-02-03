#!/bin/bash

case "$(uname -s)" in
   Darwin)
		sed -i '' '/#gh-dark-mode-only/d' "README.md"
		sed -i '' 's/#gh-light-mode-only//g' "README.md"
    ;;
   *)
		sed -i '/#gh-dark-mode-only/d' "README.md"
		sed -i 's/#gh-light-mode-only//g' "README.md"
		;;
esac
