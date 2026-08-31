import { useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import './ColorPicker.css';
import {
    generateHarmonies,
    generateShades,
    hexToHsl,
    hexToRgb,
    hslToHex,
    rgbToHex,
} from './colorUtils';

const PRESETS = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
    '#3498db', '#9b59b6', '#ff6b9d', '#4ecdc4', '#ffe66d',
    '#ff6348', '#7bed9f', '#70a1ff', '#5352ed', '#a4b0be',
    '#2f3542', '#ffffff', '#000000',
];

const FORMATS = ['HEX', 'RGB', 'HSL'];

export default function ColorPicker({ value, onChange, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [format, setFormat] = useState('HEX');
    const containerRef = useRef(null);

    // Close popover on outside click / escape
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    // Derived color values
    const rgb = useMemo(() => hexToRgb(value), [value]);
    const hsl = useMemo(() => hexToHsl(value), [value]);
    const harmonies = useMemo(() => generateHarmonies(value), [value]);
    const { shades, tints } = useMemo(() => generateShades(value, 5), [value]);

    const handleRgbChange = (field, rawValue) => {
        const num = parseInt(rawValue, 10);
        if (isNaN(num)) return;
        const clamped = Math.max(0, Math.min(255, num));
        const newRgb = { ...rgb, [field]: clamped };
        onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    };

    const handleHslChange = (field, rawValue) => {
        const num = parseInt(rawValue, 10);
        if (isNaN(num)) return;
        const max = field === 'h' ? 360 : 100;
        const clamped = Math.max(0, Math.min(max, num));
        const newHsl = { ...hsl, [field]: clamped };
        onChange(hslToHex(newHsl.h, newHsl.s, newHsl.l));
    };

    // Render format-specific inputs
    const renderFormatInputs = () => {
        switch (format) {
            case 'HEX':
                return (
                    <div className="format-input hex-input">
                        <span className="input-prefix">#</span>
                        <input
                            type="text"
                            value={value.replace('#', '').toUpperCase()}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                                if (val.length === 6) onChange('#' + val.toLowerCase());
                                else if (val.length === 3) {
                                    const expanded = val.split('').map((c) => c + c).join('');
                                    onChange('#' + expanded.toLowerCase());
                                }
                            }}
                            maxLength={6}
                            spellCheck={false}
                        />
                    </div>
                );
            case 'RGB':
                return (
                    <div className="format-input rgb-input">
                        <div className="rgb-field">
                            <label>R</label>
                            <input
                                type="number"
                                min={0}
                                max={255}
                                value={rgb.r}
                                onChange={(e) => handleRgbChange('r', e.target.value)}
                            />
                        </div>
                        <div className="rgb-field">
                            <label>G</label>
                            <input
                                type="number"
                                min={0}
                                max={255}
                                value={rgb.g}
                                onChange={(e) => handleRgbChange('g', e.target.value)}
                            />
                        </div>
                        <div className="rgb-field">
                            <label>B</label>
                            <input
                                type="number"
                                min={0}
                                max={255}
                                value={rgb.b}
                                onChange={(e) => handleRgbChange('b', e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 'HSL':
                return (
                    <div className="format-input hsl-input">
                        <div className="hsl-field">
                            <label>H<span className="unit">°</span></label>
                            <input
                                type="number"
                                min={0}
                                max={360}
                                value={hsl.h}
                                onChange={(e) => handleHslChange('h', e.target.value)}
                            />
                        </div>
                        <div className="hsl-field">
                            <label>S<span className="unit">%</span></label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={hsl.s}
                                onChange={(e) => handleHslChange('s', e.target.value)}
                            />
                        </div>
                        <div className="hsl-field">
                            <label>L<span className="unit">%</span></label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={hsl.l}
                                onChange={(e) => handleHslChange('l', e.target.value)}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="color-picker" ref={containerRef}>
            <label className="color-picker-label">Your color:</label>

            <button
                type="button"
                className="color-swatch-btn"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                aria-label="Choose color"
                style={{ background: value }}
            >
                <span className="swatch-hex">{value.toUpperCase()}</span>
            </button>

            {isOpen && (
                <div className="color-picker-popover">
                    {/* Main picker */}
                    <HexColorPicker color={value} onChange={onChange} />

                    {/* Format switcher */}
                    <div className="format-switcher">
                        {FORMATS.map((f) => (
                            <button
                                key={f}
                                type="button"
                                className={`format-tab ${format === f ? 'active' : ''}`}
                                onClick={() => setFormat(f)}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Format-specific inputs */}
                    {renderFormatInputs()}

                    {/* Color harmonies */}
                    <div className="harmonies-section">
                        <div className="harmony-row">
                            <span className="harmony-label">Complementary</span>
                            <div className="harmony-swatches">
                                {harmonies.complementary.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className="harmony-swatch"
                                        style={{ background: c }}
                                        onClick={() => onChange(c)}
                                        title={c.toUpperCase()}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="harmony-row">
                            <span className="harmony-label">Analogous</span>
                            <div className="harmony-swatches">
                                {harmonies.analogous.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className="harmony-swatch"
                                        style={{ background: c }}
                                        onClick={() => onChange(c)}
                                        title={c.toUpperCase()}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="harmony-row">
                            <span className="harmony-label">Triadic</span>
                            <div className="harmony-swatches">
                                {harmonies.triadic.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className="harmony-swatch"
                                        style={{ background: c }}
                                        onClick={() => onChange(c)}
                                        title={c.toUpperCase()}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="harmony-row">
                            <span className="harmony-label">Split Comp.</span>
                            <div className="harmony-swatches">
                                {harmonies.splitComplementary.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className="harmony-swatch"
                                        style={{ background: c }}
                                        onClick={() => onChange(c)}
                                        title={c.toUpperCase()}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Shades & Tints */}
                    <div className="shades-section">
                        <div className="shade-row">
                            <span className="shade-label">Shades</span>
                            <div className="shade-swatches">
                                {shades.map((c, i) => (
                                    <button
                                        key={`shade-${i}`}
                                        type="button"
                                        className="shade-swatch"
                                        style={{ background: c }}
                                        onClick={() => onChange(c)}
                                        title={c.toUpperCase()}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="shade-row">
                            <span className="shade-label">Tints</span>
                            <div className="shade-swatches">
                                {tints.map((c, i) => (
                                    <button
                                        key={`tint-${i}`}
                                        type="button"
                                        className="shade-swatch"
                                        style={{ background: c }}
                                        onClick={() => onChange(c)}
                                        title={c.toUpperCase()}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="color-picker-presets">
                        <span className="presets-label">Presets</span>
                        <div className="presets-grid">
                            {PRESETS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`preset-swatch ${value.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                                    style={{ background: color }}
                                    onClick={() => onChange(color)}
                                    aria-label={`Select color ${color}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}