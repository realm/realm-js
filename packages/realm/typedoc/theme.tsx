////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////
import { Application, DefaultTheme, DefaultThemeRenderContext, JSX, Options, PageEvent, Reflection } from "typedoc";

/**
 * A clone of the default theme, which prints a message when rendering each page.
 */
export class LoggingTheme extends DefaultTheme {
  render(page: PageEvent<Reflection>): string {
    return super.render(page);
  }
}

/**
 * The theme context is where all of the partials live for rendering a theme,
 * in addition to some helper functions.
 */
export class FooterOverrideThemeContext extends DefaultThemeRenderContext {
  constructor(theme: DefaultTheme, options: Options) {
    super(theme, options);

    const oldFooter = this.footer;

    // Overridden methods must have `this` bound if they intend to use it.
    // <JSX.Raw /> may be used to inject HTML directly.
    this.footer = () => {
      return (
        <>
          {oldFooter()}
          <div class="container">
            <JSX.Raw html={this.markdown("Custom footer text, with **markdown** support!")} />
          </div>
        </>
      );
    };
  }
}

/**
 * A near clone of the default theme, that adds some custom text after the footer.
 */
export class FooterOverrideTheme extends DefaultTheme {
  private _contextCache?: FooterOverrideThemeContext;

  override getRenderContext(): FooterOverrideThemeContext {
    this._contextCache ||= new FooterOverrideThemeContext(this, this.application.options);
    return this._contextCache;
  }
}

/**
 * Called by TypeDoc when loading this theme as a plugin. Should be used to define themes which
 * can be selected by the user.
 */
export function load(app: Application) {
  // Hooks can be used to inject some HTML without fully overwriting the theme.
  app.renderer.hooks.on("body.begin", (_) => (
    <script>
      <JSX.Raw html="console.log(`Loaded ${location.href}`)" />
    </script>
  ));

  // Or you can define a custom theme. This one behaves exactly like the default theme,
  // but logs a message when rendering a page.
  app.renderer.defineTheme("logging", LoggingTheme);

  // While this one overwrites the footer to include custom content.
  app.renderer.defineTheme("footer", FooterOverrideTheme);
}
