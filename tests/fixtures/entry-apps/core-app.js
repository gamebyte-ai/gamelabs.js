// A 2D game: the three.js-free app from `/core`, the ready-made modules from the full entry.
import { GamelabsApp, Hud, UIEvents } from "@gamebyte/gamelabsjs/core";
import { MainScreenBinding, MainScreenUIIds, SettingsBinding, SettingsUIIds, UIComponentsBinding } from "@gamebyte/gamelabsjs";
import { bootEntryApp } from "./boot.js";

bootEntryApp({ GamelabsApp, Hud, UIEvents, UIComponentsBinding, SettingsBinding, MainScreenBinding, MainScreenUIIds, SettingsUIIds });
