import { Cog8ToothIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-stark/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";
import { devnet, sepolia, mainnet } from "@starknet-react/chains";
import { Faucet } from "~~/components/scaffold-stark/Faucet";
import { FaucetSepolia } from "~~/components/scaffold-stark/FaucetSepolia";
import { BlockExplorerSepolia } from "./scaffold-stark/BlockExplorerSepolia";
import { BlockExplorer } from "./scaffold-stark/BlockExplorer";
import Link from "next/link";
import Image from "next/image";
import { BlockExplorerDevnet } from "./scaffold-stark/BlockExplorerDevnet";

/**
 * Site footer
 */
export const Footer = () => {
  const nativeCurrencyPrice = useGlobalState(
    (state) => state.nativeCurrencyPrice,
  );
  const { targetNetwork } = useTargetNetwork();

  // NOTE: workaround - check by name also since in starknet react devnet and sepolia has the same chainId
  const isLocalNetwork =
    targetNetwork.id === devnet.id && targetNetwork.network === devnet.network;
  const isSepoliaNetwork =
    targetNetwork.id === sepolia.id &&
    targetNetwork.network === sepolia.network;
  const isMainnetNetwork =
    targetNetwork.id === mainnet.id &&
    targetNetwork.network === mainnet.network;

  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0 bg-base-100">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto">
            {isSepoliaNetwork && (
              <>
                <FaucetSepolia />
                <BlockExplorerSepolia />
              </>
            )}
            {isLocalNetwork && (
              <>
                <Faucet />
                <BlockExplorerDevnet />
              </>
            )}
            {isMainnetNetwork && (
              <>
                <BlockExplorer />
              </>
            )}
            <Link
              href={"/configure"}
              passHref
              className="btn btn-sm font-normal gap-1 cursor-pointer border border-[#32BAC4] shadow-none"
            >
              <Cog8ToothIcon className="h-4 w-4 text-[#32BAC4]" />
              <span>Configure Contracts</span>
            </Link>
            {nativeCurrencyPrice > 0 && (
              <div>
                <div className="btn btn-sm font-normal gap-1 cursor-auto border border-[#32BAC4] shadow-none">
                  <CurrencyDollarIcon className="h-4 w-4 text-[#32BAC4]" />
                  <span>{nativeCurrencyPrice}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Footer Content */}
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-text">
            Built with love by <strong>Habiteam</strong>
          </p>
          <div className="team-avatars">
            <a 
              href="https://github.com/Markkop" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="avatar-link" 
              title="Markkop"
            >
              <Image 
                src="https://github.com/Markkop.png" 
                alt="Markkop" 
                className="team-avatar"
                width={32}
                height={32}
              />
            </a>
            <a 
              href="https://github.com/dutragustavo" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="avatar-link" 
              title="dutragustavo"
            >
              <Image 
                src="https://github.com/dutragustavo.png" 
                alt="dutragustavo" 
                className="team-avatar"
                width={32}
                height={32}
              />
            </a>
            <a 
              href="https://github.com/hpereira1" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="avatar-link" 
              title="hpereira1"
            >
              <Image 
                src="https://github.com/hpereira1.png" 
                alt="hpereira1" 
                className="team-avatar"
                width={32}
                height={32}
              />
            </a>
            <a 
              href="https://github.com/artur-simon" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="avatar-link" 
              title="artur-simon"
            >
              <Image 
                src="https://github.com/artur-simon.png" 
                alt="artur-simon" 
                className="team-avatar"
                width={32}
                height={32}
              />
            </a>
          </div>
        </div>
        
        <span className="footer-separator">|</span>
        
        <div className="footer-project">
          <p className="footer-text">
            For the <span className="footer-highlight">CryptoLar</span> hackathon
          </p>
          <a 
            href="https://www.cryptolar.com.br/" 
            target="_blank" 
            rel="noopener noreferrer" 
            title="Visit CryptoLar"
            className="cryptolar-link"
          >
            <Image 
              src="https://www.cryptolar.com.br/images/logo_crypto_lar.png" 
              alt="CryptoLar" 
              className="cryptolar-logo"
              width={118}
              height={30}
            />
          </a>
        </div>
        
        <span className="footer-separator">|</span>
        
        <a 
          href="https://github.com/Markkop/habit-tracker-strk" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="footer-link" 
          title="View on GitHub"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
      </footer>
    </div>
  );
};
