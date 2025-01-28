## Creating new project
```bash
tnp new my-standalone-project
tnp new my-organization/main-entry-project
```

## Isomorphic code build

```bash 
tnp build # Typescript tsc + Angular ng build
tnp b

tnp build:watch
tnp bw
```

## Angular app build

```bash
tnp app # normal angular ng serve + docker run
tnp app --websql # start ng serve in special "backend inside browser" mode
```

## Migrations (for databases)

```bash
tnp migration # migration menu
tnp m

# create migration file (with classes for all detected contexts)
tnp migration:create 
tnp mc

 # run all migrations (for all contexts)
tnp migration:run   # similar to 'tnp run', but won't start express
tnp mr              # server and it will stop after contexts
                    # initialize() functions...

 # revert migration to timestamp
tnp migration:revert timestamp  # similar to 'tnp run', but won't start express
tnp mr timestamp                # server and it will stop after contexts
                                # initialize() functions...
```

## Documentation (mkdocs , storybook, compodoc) build

```bash
tnp docs
tnp d

tnp docs:watch
tnp dw
```

## Testing

```bash
# Unit/Integration tests (jest)
tnp test
tnp t

tnp test:watch
tnp tw

# recreate jest snapshots
tnp test:up:snapshots
tnp tu

# E2e testing (playwright)
tnp e2e
tnp e2e:watch
```

## Release

Release all possible artifacts:

- npm lib (entrypoint src/lib/index.ts)
- cli tool (entrypoint src/cli.ts)
- fe/be angular/node app  (entrypoint src/app.ts)
- electron app  (entrypoint src/app.electron.ts)
- vscode plugin (entrypoint src/app.vscode.ts)
- mobile cordova app (entrypoint src/app.mobile.ts)
- docs (mkdocs, storybook, compodoc)

```bash
# show menu
tnp release
tnp r

# repeat last release process
tnp release:last
tnp rl
