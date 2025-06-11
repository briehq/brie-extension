import { useState } from 'react';

import { IS_DEV, NAME } from '@extension/env';

import { navigateTo } from '@src/utils';

import AuthPage from './auth-page';
import WelcomeScreen from './welcome-screen';

const Header = () => {
  const logo = chrome.runtime.getURL('popup/brie-icon-64x64.png');
  return (
    <button
      onClick={() => navigateTo('https://go.brie.io/lp?utm_source=extension')}
      className="mb-5 flex items-center gap-x-2">
      <img src={logo} className="size-10" alt="Brie" />
      {IS_DEV && <h1 className="-ml-1.5 text-xl font-semibold text-[#df8801]">{NAME}</h1>}
    </button>
  );
};

const OnBoardingScreen = () => {
  const [currentSteps, setCurrentSteps] = useState<number>(1);

  const renderStep = () => {
    switch (currentSteps) {
      case 1:
        return <WelcomeScreen setCurrentSteps={setCurrentSteps} />;
      case 2:
        return <AuthPage />;

      default:
        return null;
    }
  };
  return (
    <main className="text-center">
      <Header />
      {renderStep()}
      <footer className="mt-4">
        <h5>By clicking "Continue",</h5>
        <h5>
          you agree to our <a href="https://go.brie.io/lp?utm_source=extension">Terms of Service</a> and{' '}
          <a href="https://go.brie.io/lp?utm_source=extension">Privacy</a>
        </h5>
      </footer>
    </main>
  );
};

export default OnBoardingScreen;
