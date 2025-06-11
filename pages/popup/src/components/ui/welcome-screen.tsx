import { Button } from '@extension/ui';

const WelcomeScreen = ({ setCurrentSteps }: { setCurrentSteps: React.Dispatch<React.SetStateAction<number>> }) => {
  const redirectToAuthPage = () => {
    setCurrentSteps(2);
  };

  const handleContinueAsGuest = () => {
    chrome.storage.local.set({ userMode: 'guest' }, () => {});
  };

  return (
    <div>
      <h1 className="mb-4 text-[20px] font-bold">Report bugs in seconds</h1>
      <h3>Get full access with your email</h3>
      <h3 className="mb-5">or a quick peek as a visitor</h3>
      <Button className="mx-auto block w-[80%]" onClick={redirectToAuthPage}>
        Continue with email
      </Button>
      <Button
        className="mx-auto mt-4 block w-[80%] border-none bg-transparent text-black shadow-none hover:!scale-100 hover:!border-none hover:!bg-transparent hover:!text-inherit hover:!shadow-none"
        onClick={handleContinueAsGuest}>
        Continue as a guest
      </Button>
    </div>
  );
};

export default WelcomeScreen;
