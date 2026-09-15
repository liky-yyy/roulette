import './localization';
import options from './options';
import { Roulette } from './roulette';
import { installShareReplay } from './shareReplay';

const roulette = new Roulette();
installShareReplay(roulette);

(window as any).roulette = roulette;
(window as any).options = options;
