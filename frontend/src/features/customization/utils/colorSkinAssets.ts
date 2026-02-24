import blueSlimeSkin from '../../../assets/slime/colors/BlueSlime.png';
import greenSlimeSkin from '../../../assets/slime/colors/GreenSlime.png';
import orangeSlimeSkin from '../../../assets/slime/colors/OrangeSlime.png';
import pinkSlimeSkin from '../../../assets/slime/colors/PinkSlime.png';
import redSlimeSkin from '../../../assets/slime/colors/RedSlime.png';

const colorSkinAssetByItemId: Record<string, string> = {
  'slime-green': greenSlimeSkin,
  'slime-pink': pinkSlimeSkin,
  'slime-cyan': blueSlimeSkin,
  'slime-red': redSlimeSkin,
  'slime-sunset': orangeSlimeSkin,
};

export const getColorSkinAssetSrc = (itemId: string | null | undefined): string | null => {
  if (!itemId) {
    return null;
  }

  return colorSkinAssetByItemId[itemId] ?? null;
};
