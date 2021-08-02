import logo from './logo.svg';
import './App.css';
import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import RuinStakingABI from "./abi/RuinStaking.json";

function App() {
  const [input, setInput] = useState("");
  const [inputWithdraw, setInputWithdraw] = useState("");
  const [reward, setReward] = useState("");

  const ruinStakingAddress = "0x31CF42feE59E96a98985046C1bFAcBBFC80FFDfc";

  useEffect(() => {
    const queryReward = async () => {
      await window.ethereum.enable()
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const instance = new ethers.Contract(ruinStakingAddress, RuinStakingABI, signer);

      const reward = await instance.take("0");
      setReward(reward.toString());

      setInterval(async () => {
        const reward = await instance.take("0");
        setReward(reward.toString());
      }, 3000);
    }

    queryReward();
  }, []);

  const deposit = useCallback(async () => {
    await window.ethereum.enable()
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const instance = new ethers.Contract(ruinStakingAddress, RuinStakingABI, signer);
    await instance.deposit("0", `${Number(input) * 10 ** 18}`);
  }, [input, ruinStakingAddress]);

  const withdraw = useCallback(async () => {
    await window.ethereum.enable()
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const instance = new ethers.Contract(ruinStakingAddress, RuinStakingABI, signer);
    await instance.withdraw("0", `${Number(inputWithdraw) * 10 ** 18}`);
  }, [inputWithdraw, ruinStakingAddress]);

  const harvest = useCallback(async () => {
    await window.ethereum.enable()
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const instance = new ethers.Contract(ruinStakingAddress, RuinStakingABI, signer);
    await instance.harvest("0", signer.getAddress());
  }, [inputWithdraw, ruinStakingAddress]);
 
  return (
    <div className="App">
      <header className="App-header">
        <div>
          <p>ERC20 Mock Token: 0xcb1e422c17e22b1f9aaa91c91ea94614149d328e</p>
          <h2>Let's do f***ing deposit to earn RUIN token</h2>
          <input type="text" style={{ padding: 10 }} onChange={e => setInput(e.target.value)} value={input}/>
          <button style={{ display: 'block', margin: '0 auto', marginTop: 30, padding: '10px 20px' }} onClick={deposit}>Deposit</button>
          <h2>WITHDRAW</h2>
          <input type="text" style={{ padding: 10 }}  onChange={e => setInputWithdraw(e.target.value)} value={inputWithdraw} />
          <button style={{ display: 'block', margin: '0 auto', marginTop: 30, padding: '10px 20px' }} onClick={withdraw}>Withdraw</button>
          <h2>Harvest to claim extra Ruin token</h2>
          <button style={{ display: 'block', margin: '0 auto', marginTop: 30, padding: '10px 20px' }} onClick={harvest}>Harvest</button>
          <h1>TOTAL REWARD: {reward}</h1>
        </div>
      </header>
    </div>
  );
}

export default App;
