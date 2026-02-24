import { useMemo } from 'react';
import { useCustomization } from '../hooks/useCustomization';
import { getColorSkinAssetSrc } from '../utils';
import type { CosmeticItem } from '../types';

type CustomizationWorkspaceProps = {
  token: string;
  slimeName?: string;
};

const isItemOwned = (ownedItemIds: string[], item: CosmeticItem) => item.isStarter || ownedItemIds.includes(item.id);

export const CustomizationWorkspace = ({ token, slimeName = 'My Slime' }: CustomizationWorkspaceProps) => {
  const {
    overview,
    selectedItem,
    selectedItemId,
    loading,
    actionLoading,
    error,
    notice,
    setSelectedItemId,
    setNotice,
    setError,
    claimDailyCoins,
    addCoinsDev,
    unlockItem,
    equipItem,
  } = useCustomization(token);

  const isLocalhostUi = useMemo(() => {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }, []);

  const coins = overview?.wallet.coins ?? 0;
  const ownedItemIds = overview?.ownedItemIds ?? [];
  const equippedBySlot = overview?.equippedBySlot ?? {};
  const imageBackedShopItems = overview?.catalog.filter((item) => Boolean(getColorSkinAssetSrc(item.id))) ?? [];
  const imageBackedShopItemIds = new Set(imageBackedShopItems.map((item) => item.id));
  const equippedColor = overview?.catalog.find((item) => item.id === equippedBySlot.color);
  const equippedColorImageSrc = getColorSkinAssetSrc(equippedColor?.id);
  const equippedHatName =
    equippedBySlot.hat && imageBackedShopItemIds.has(equippedBySlot.hat)
      ? overview?.catalog.find((item) => item.id === equippedBySlot.hat)?.name ?? 'None'
      : 'None';
  const equippedTrailName =
    equippedBySlot.trail && imageBackedShopItemIds.has(equippedBySlot.trail)
      ? overview?.catalog.find((item) => item.id === equippedBySlot.trail)?.name ?? 'None'
      : 'None';
  const effectiveSelectedItem =
    selectedItem && getColorSkinAssetSrc(selectedItem.id)
      ? selectedItem
      : imageBackedShopItems.find((item) => item.id === selectedItemId) ?? imageBackedShopItems[0] ?? null;
  const selectedItemColorImageSrc = getColorSkinAssetSrc(effectiveSelectedItem?.slot === 'color' ? effectiveSelectedItem.id : null);

  return (
    <section className="customize-board" aria-label="Customization and wallet">
      <div className="customize-header-row">
        <div>
          <p className="customize-kicker">Progression Systems</p>
          <h3>Customization Shop</h3>
          <p className="customize-subtitle">Buy cosmetics, equip them, and keep your items after refresh.</p>
        </div>
        <div className="coin-hud-card" aria-label="Current coins">
          <div className="coin-stack" aria-hidden="true">
            <span className="coin coin-back"></span>
            <span className="coin coin-front"></span>
          </div>
          <div>
            <div className="coin-hud-label">Coins</div>
            <div className="coin-hud-value">{coins}</div>
          </div>
        </div>
      </div>

      {(error || notice) && (
        <div className={`customize-banner ${error ? 'error' : ''}`}>
          <div>{error ?? notice}</div>
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              setNotice(null);
              setError(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="customize-layout">
        <section className="customize-panel">
          <div className="section-header">
            <h3>Wallet & Loadout</h3>
          </div>

          <div className="customize-actions">
            <button
              type="button"
              className="btn-refresh"
              onClick={() => void claimDailyCoins()}
              disabled={actionLoading || loading || !overview?.wallet.dailyClaimAvailable}
            >
              {overview?.wallet.dailyClaimAvailable ? 'Claim Daily +50' : 'Daily Claimed'}
            </button>

            {isLocalhostUi && (
              <button
                type="button"
                className="btn-refresh"
                onClick={() => void addCoinsDev(100)}
                disabled={actionLoading || loading}
              >
                Demo +100 Coins
              </button>
            )}
          </div>

          <div className="loadout-preview-card">
            <div className="loadout-preview-header">
              <strong>Current Loadout</strong>
              <span>{slimeName}</span>
            </div>

            <div className="loadout-preview-stage">
              <div
                className="loadout-slime-aura"
                style={{
                  background:
                    overview?.catalog.find((item) => item.id === equippedBySlot.aura)?.previewGradient ??
                    'linear-gradient(135deg, rgba(52,211,153,0.35), rgba(16,185,129,0.1))',
                }}
              ></div>
              <div
                className={`loadout-slime-core ${equippedColorImageSrc ? 'image-mode' : ''}`}
                style={
                  equippedColorImageSrc
                    ? {
                        backgroundImage: `url(${equippedColorImageSrc})`,
                      }
                    : { background: equippedColor?.previewGradient ?? 'linear-gradient(135deg, #22c55e, #10b981)' }
                }
              >
                <span className={`loadout-slime-eye left ${equippedColorImageSrc ? 'overlay' : ''}`}></span>
                <span className={`loadout-slime-eye right ${equippedColorImageSrc ? 'overlay' : ''}`}></span>
                <span className={`loadout-slime-smile ${equippedColorImageSrc ? 'overlay' : ''}`}></span>
              </div>
              {equippedHatName !== 'None' && <div className="loadout-hat-badge">{equippedHatName}</div>}
              {equippedTrailName !== 'None' && <div className="loadout-trail-badge">{equippedTrailName}</div>}
            </div>

            <div className="loadout-slots-list">
              <div><span>Aura</span><strong>{overview?.catalog.find((item) => item.id === equippedBySlot.aura)?.name ?? 'Sprout Aura'}</strong></div>
              <div><span>Color</span><strong>{equippedColor?.name ?? 'Classic Green'}</strong></div>
              <div><span>Hat</span><strong>{equippedHatName}</strong></div>
              <div><span>Trail</span><strong>{equippedTrailName}</strong></div>
            </div>
          </div>

          <div className="item-preview-card">
            <div className="item-preview-header">
              <strong>Selected Item Preview</strong>
              <span>{effectiveSelectedItem ? effectiveSelectedItem.slot.toUpperCase() : 'Select an item'}</span>
            </div>

            {effectiveSelectedItem ? (
              <>
                <div
                  className={`item-preview-swatch ${selectedItemColorImageSrc ? 'image-mode' : ''}`}
                  style={
                    selectedItemColorImageSrc
                      ? {
                          backgroundImage: `url(${selectedItemColorImageSrc})`,
                          backgroundColor: 'rgba(11, 16, 32, 0.35)',
                        }
                      : { background: effectiveSelectedItem.previewGradient }
                  }
                ></div>
                <h4>{effectiveSelectedItem.name}</h4>
                <p>{effectiveSelectedItem.description}</p>
                <div className="item-preview-meta">
                  <span>Slot: {effectiveSelectedItem.slot}</span>
                  <span>{effectiveSelectedItem.isStarter ? 'Starter' : `${effectiveSelectedItem.priceCoins} coins`}</span>
                </div>
              </>
            ) : (
              <p className="customize-empty">No item selected yet.</p>
            )}
          </div>
        </section>

        <section className="customize-panel">
            <div className="section-header">
            <h3>Shop Items</h3>
          </div>

          {loading && <p className="customize-empty">Loading customization data...</p>}

          {!loading && overview && (
            <div className="customize-shop-grid">
              {imageBackedShopItems.map((item) => {
                const owned = isItemOwned(ownedItemIds, item);
                const equipped = equippedBySlot[item.slot] === item.id;
                const canAfford = coins >= item.priceCoins;

                return (
                  <article
                    key={item.id}
                    className={`shop-item-card ${selectedItemId === item.id ? 'selected' : ''}`}
                    onClick={() => setSelectedItemId(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedItemId(item.id);
                      }
                    }}
                  >
                    <div
                      className={`shop-item-swatch ${item.slot === 'color' && getColorSkinAssetSrc(item.id) ? 'image-mode' : ''}`}
                      style={
                        item.slot === 'color' && getColorSkinAssetSrc(item.id)
                          ? {
                            backgroundImage: `url(${getColorSkinAssetSrc(item.id)})`,
                              backgroundColor: 'rgba(11, 16, 32, 0.35)',
                            }
                          : { background: item.previewGradient }
                      }
                    ></div>
                    <div className="shop-item-topline">
                      <h4>{item.name}</h4>
                      <span>{item.isStarter ? 'Starter' : `${item.priceCoins}c`}</span>
                    </div>
                    <p>{item.description}</p>
                    <div className="shop-item-slot">Slot: {item.slot}</div>

                    <div className="shop-item-actions">
                      {!owned ? (
                        <button
                          type="button"
                          className="btn-small"
                          disabled={actionLoading || !canAfford}
                          onClick={(event) => {
                            event.stopPropagation();
                            void unlockItem(item);
                          }}
                        >
                          {canAfford ? 'Unlock' : 'Not enough coins'}
                        </button>
                      ) : equipped ? (
                        <button type="button" className="btn-refresh" disabled>
                          Equipped
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-small"
                          disabled={actionLoading}
                          onClick={(event) => {
                            event.stopPropagation();
                            void equipItem(item);
                          }}
                        >
                          Equip
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
};
