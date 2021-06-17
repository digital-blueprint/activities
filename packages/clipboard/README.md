# Clipboard-management

## Overview

The clipboard activity `dbp-clipboard-managing` is for displaying, deleting and saving data from and to the clipboard. 

It is best used together the `dbp-file-sink` / `dbp-file-source` web components with enabled `clipboard` target 
in order to manage files which are stored in the clipboard.

So for example if there are files saved in the clipboard with the `dbp-file-sink`, you can navigate to the `dbp-clipboard-managing` activity
and then save these files permanently, instead of navigating to the `dbp-file-sink` again.


## Usage

`
<dbp-clipboard-management> </dbp-clipboard-management>
`

## Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `<dbp-clipboard-management subscribe="clipboard-files:clipboard-files-global-name" lang="de"></dbp-clipboard-management>`
- `enabled-targets` (optional, default: `local`): sets which destination are enabled
    - you can use `local` and `nextcloud`
    - example `<dbp-clipboard-management subscribe="clipboard-files:clipboard-files-global-name" enabled-targets="local,nextcloud"></dbp-clipboard-management>`
- `allow-nesting` (optional): is an boolean for demo purposes or special use cases.
  It availables the clipboard in the file-source and file-sink in the clipboard itself.
    - example `<dbp-clipboard-management subscribe="clipboard-files:clipboard-files-global-name" allow-nesting></dbp-clipboard-management>` ... all file types (default)
- `nextcloud-auth-url` (optional): Nextcloud Auth Url to use with the Nextcloud file picker
    - example `<dbp-clipboard-management subscribe="clipboard-files:clipboard-files-global-name" nextcloud-auth-url="http://localhost:8081/index.php/apps/webapppassword"></dbp-clipboard-management>`
    - `nextcloud-web-dav-url` also needs to be set for the Nextcloud file picker to be active
- `nextcloud-web-dav-url` (optional): Nextcloud WebDav Url to use with the Nextcloud file picker
    - example `<dbp-clipboard-management subscribe="clipboard-files:clipboard-files-global-name" nextcloud-web-dav-url="http://localhost:8081/remote.php/dav/files"></dbp-clipboard-management>`
    - `nextcloud-auth-url` also needs to be set for the Nextcloud file picker to be active
- `nextcloud-file-url` (optional): Nextcloud File Url to use with the Nextcloud file picker
    - example `<dbp-clipboard-management subscribe="clipboard-files:clipboard-files-global-name" nextcloud-file-url="http://localhost:8081/apps/files/?dir="></dbp-clipboard-management>`
- `nextcloud-auth-info` (optional): Additional authentication information text that is shown in the Nextcloud file picker
    - example `<dbp-clipboard-management subscribe="clipboard-files:clipboard-files-global-name" nextcloud-auth-info="You need special permissions for this function"></dbp-clipboard-management>`
    

<br><br>