#!/bin/bash

TEST_APP_BUNDLE_ID=com.microsoft.ReactTestApp

# Check if a simulator is booted
booted_simulators=$(xcrun simctl list | grep "Booted")

if [ -z "$booted_simulators" ]; then
    echo "No simulator booted. Please boot a simulator with the React Native app running and re-run the script."
    exit 1
fi

# Count the number of booted simulators
booted_count=$(echo "$booted_simulators" | wc -l)

if [ "$booted_count" -gt 1 ]; then
    echo "More than one simulator is booted. Please keep only one open and re-run the script."
    exit 1
fi

# Extract the name of the booted simulator
booted_simulator=$(echo "$booted_simulators" | xargs)
echo -e "Running script on simulator: $booted_simulator\n"

# Get the app container path
app_container_path=$(xcrun simctl get_app_container booted "$TEST_APP_BUNDLE_ID" data 2>/dev/null)

# Check if the command was successful
if [ $? -ne 0 ] || [ -z "$app_container_path" ]; then
    echo "Failed to get app container path for $TEST_APP_BUNDLE_ID"
    exit 1
fi

# Append /Documents to the path
documents_path="$app_container_path/Documents"

# Check if the directory exists
if [ ! -d "$documents_path" ]; then
    echo "Documents directory does not exist at $documents_path"
    exit 1
fi

# Run xattr on all files in the directory
for file in "$documents_path"/icloud-backup-tests/*.realm; do
    if [ -e "$file" ]; then
        filename=$(basename "$file")
        attrs=$(xattr "$file" 2>/dev/null)
        if [ -z "$attrs" ]; then
            echo -e "\033[1;33m$filename:\033[0m no attributes set ❌"
        else
            if echo "$attrs" | grep -q "com_apple_backup_excludeItem"; then
                echo -e "\033[0;32m\033[1m$filename:\033[0m: $attrs\033[0;32m ✅\033[0m"
            else
                echo "$filename: $attrs"
            fi
        fi
    fi
done

