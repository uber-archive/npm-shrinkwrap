type ShrinkwrapOptions := {
    dirname: String,
    createUri: (name: String, version: String) => uri: String,
    registries: Array<registryUri: String>,
    rewriteResolved: (resolved: String) => resolved: String,
    warnOnNotSemver: Boolean,
    validators?: Array<
        (dep: Object, key: String) => Error | null
    >
}

npm-shrinkwrap := (
    opts: ShrinkwrapOptions,
    cb: Callback<Error, warnings: Array<TypedError>>
) => void

npm-shrinkwrap/analyze-dependency := (
    name: String,
    gitLink: String,
    opts: ShrinkwrapOptions,
    cb: Callback<Error, TypedError>
) => void

npm-shrinkwrap/set-resolved := 
    (ShrinkwrapOptions, Callback<Error, void>) => void

npm-shrinkwrap/trim-and-sort-shrinkwrap :=
    (ShrinkwrapOptions, Callback<Error, void>) => void

npm-shrinkwrap/verify-git :=
    (ShrinkwrapOptions, Callback<Error, void>) => void

npm-shrinkwrap/bin/cli := (opts: ShrinkwrapOptions & {
    help: Boolean,
    install: Boolean,
    onwarn: Function<warnings: Array<TypedError>>,
    onerror: Function<Error | TypedError>,
    cmd: String,
    silent: Boolean,
    _: Array<additionalArg: String>,
    packageVersion: String,
    moduleName: String,
    depth: Number,
    short: Boolean
}) => void
