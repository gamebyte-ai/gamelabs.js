// A 3D game: everything from the full entry, whose app builds a three.js World. It is the control
// for core-app.js: its build must hold three.js, or the "no three.js" check could not see it.
import {
  GamelabsApp,
  Hud,
  MainScreenBinding,
  MainScreenUIIds,
  SettingsBinding,
  SettingsUIIds,
  UIComponentsBinding,
  UIEvents,
} from "@gamebyte/gamelabsjs";
import { bootEntryApp } from "./boot.js";

bootEntryApp({ GamelabsApp, Hud, UIEvents, UIComponentsBinding, SettingsBinding, MainScreenBinding, MainScreenUIIds, SettingsUIIds });
