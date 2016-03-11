empty_section=$(cat <<EOS
x.x.x Release notes (yyyy-MM-dd)
=============================================================
### API breaking changes
* None.
### Enhancements
* None.
### Bugfixes
* None.
EOS)
changelog=$(cat CHANGELOG.md)
echo "$empty_section" > CHANGELOG.md
echo >> CHANGELOG.md
echo "$changelog" >> CHANGELOG.md
