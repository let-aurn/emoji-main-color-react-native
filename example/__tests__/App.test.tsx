/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';
import {getEmojiColors, useEmojiColor} from 'emoji-main-color-react-native';
import {useEmojiKeyboard} from 'react-native-system-emoji-picker';

// Note: import explicitly to use the types shipped with jest.
import {describe, it, expect, beforeEach} from '@jest/globals';

import {fireEvent, render} from '@testing-library/react-native';

jest.mock('emoji-main-color-react-native', () => ({
  getEmojiColors: jest.fn(),
  useEmojiColor: jest.fn(),
}));

jest.mock('react-native-system-emoji-picker', () => ({
  SystemEmojiPicker: 'RNSystemEmojiPickerView',
  useEmojiKeyboard: jest.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    (useEmojiKeyboard as jest.Mock).mockReturnValue({
      ref: {current: null},
      open: jest.fn(),
      dismiss: jest.fn(),
    });

    (useEmojiColor as jest.Mock).mockReturnValue({
      result: {
        emoji: '🍋',
        mainColor: '#F4D83D',
        mainDarkColor: '#6D8D3F',
        mainLightColor: '#F8E789',
        palette: ['#F4D83D', '#9DBB52', '#6D8D3F'],
        source: 'computed',
      },
      loading: false,
      error: null,
      reload: jest.fn(),
    });

    (getEmojiColors as jest.Mock).mockResolvedValue([
      {
        emoji: '🍋',
        mainColor: '#F4D83D',
        mainDarkColor: '#6D8D3F',
        mainLightColor: '#F8E789',
        source: 'computed',
      },
      {
        emoji: '🦊',
        mainColor: '#D97729',
        mainDarkColor: '#8F3F1E',
        mainLightColor: '#F3A552',
        source: 'computed',
      },
    ] as Array<{
      emoji: string;
      mainColor: string;
      mainDarkColor: string;
      mainLightColor: string;
      source: string;
    }>);
  });

  it('renders correctly', () => {
    render(<App />);
  });

  it('toggles cache text between memory and disk', () => {
    const screen = render(<App />);

    expect(screen.getByText('Cache: memory')).toBeTruthy();

    fireEvent.press(screen.getByText('Use disk cache'));
    expect(screen.getByText('Cache: disk')).toBeTruthy();
  });

  it('runs the batch demo', async () => {
    const screen = render(<App />);

    fireEvent.press(screen.getByText('Run batch demo'));

    expect(await screen.findByText('🍋 #F4D83D • 🦊 #D97729')).toBeTruthy();
  });

  it('shows the picker status', () => {
    const screen = render(<App />);

    expect(screen.getByText('Picker: closed')).toBeTruthy();
  });
});
