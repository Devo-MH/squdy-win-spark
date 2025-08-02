# Squdy - Burn to Win Platform

A revolutionary blockchain platform that combines the excitement of lottery-style competitions with the economic benefits of token burning mechanisms. Users stake SQUDY tokens to participate in campaigns, complete social media engagement tasks, and compete for prizes while contributing to token deflation.

## 🚀 Features

### Core Functionality
- **Campaign Management**: Create, manage, and monitor burn-to-win campaigns
- **Token Staking**: Users stake SQUDY tokens to participate in campaigns
- **Social Media Integration**: Required engagement tasks (X, Discord, Telegram, Medium)
- **Smart Contract Integration**: Blockchain-based winner selection and token burning
- **Admin Panel**: Whitelisted admin management with full campaign control
- **Real-time Updates**: Live campaign progress and participant tracking

### User Experience
- **Wallet Integration**: MetaMask support for seamless blockchain interactions
- **Campaign Discovery**: Browse active and finished campaigns
- **Progress Tracking**: Real-time staking progress and social task completion
- **Winner Announcements**: Transparent winner selection with blockchain verification
- **Mobile Responsive**: Optimized for all device sizes

### Technical Features
- **TypeScript**: Full type safety and better development experience
- **React 18**: Latest React features with hooks and modern patterns
- **Tailwind CSS**: Utility-first styling with custom design system
- **Shadcn/ui**: Beautiful, accessible UI components
- **Vite**: Fast development and build tooling
- **Ethers.js**: Ethereum/BSC blockchain integration

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **React Router** for navigation
- **TanStack Query** for data fetching
- **Tailwind CSS** for styling
- **Shadcn/ui** for UI components
- **Lucide React** for icons

### Blockchain Integration
- **Ethers.js** for Web3 interactions
- **MetaMask** wallet connection
- **BSC (Binance Smart Chain)** support
- **Smart Contract** integration for campaigns

### Data Management
- **Mock Data Services** for development
- **TypeScript Interfaces** for type safety
- **Local State Management** with React hooks

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask browser extension

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd squdy-win-spark
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

### Build for Production
```bash
npm run build
npm run preview
```

## 🎯 Platform Overview

### Campaign Lifecycle
1. **Creation**: Admin creates campaign with parameters
2. **Launch**: Campaign goes live and accepts participants
3. **Participation**: Users stake tokens and complete social tasks
4. **Selection**: Smart contract randomly selects winners
5. **Burning**: All staked tokens are permanently burned
6. **Rewards**: Winners receive prizes

### Token Economics
- **Ticket System**: Each campaign defines a ticket amount in SQUDY
- **Multiple Tickets**: Users get more tickets based on staked amount
- **Deflationary Pressure**: All staked tokens are burned, reducing supply
- **Prize Distribution**: Winners receive cash, NFTs, or SQUDY tokens

### Social Media Requirements
- Follow X (Twitter) account
- Like and retweet campaign posts
- Join Discord server
- Join Telegram group
- Subscribe to newsletter
- Follow Medium blog (optional)

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_APP_NAME=Squdy - Burn to Win
VITE_APP_DESCRIPTION=Revolutionary burn-to-win platform
VITE_BSC_RPC_URL=https://bsc-dataseed.binance.org/
VITE_SQUDY_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
VITE_PANCAKESWAP_URL=https://pancakeswap.finance/swap?outputCurrency=
```

### Smart Contract Addresses
Update the contract addresses in `src/services/mockData.ts`:

```typescript
export const tokenInfo: TokenInfo = {
  contractAddress: 'YOUR_SQUDY_CONTRACT_ADDRESS',
  pancakeSwapUrl: 'YOUR_PANCAKESWAP_URL',
  // ... other properties
};
```

## 📱 Pages & Components

### Core Pages
- **HomePage**: Landing page with active campaigns and platform overview
- **CampaignDetail**: Individual campaign page with staking and social tasks
- **AdminPanel**: Admin dashboard for campaign management
- **TermsPage**: Terms and conditions
- **PrivacyPage**: Privacy policy

### Key Components
- **CampaignCard**: Campaign preview cards
- **Header/Footer**: Navigation and site information
- **HeroSection**: Landing page hero
- **SocialMediaSteps**: Social task completion interface
- **StakingInterface**: Token staking form and progress

## 🔐 Security Features

### Smart Contract Security
- **Admin Controls**: Whitelisted admin addresses only
- **Random Selection**: Verifiable random winner selection
- **Token Burning**: Irreversible token destruction
- **Access Control**: Role-based permissions

### Frontend Security
- **Input Validation**: Comprehensive form validation
- **Wallet Verification**: Secure wallet connection
- **Transaction Confirmation**: User confirmation for all transactions
- **Error Handling**: Graceful error handling and user feedback

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Deploy automatically on push to main branch

### Netlify Deployment
1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Deploy automatically on push to main branch

### Manual Deployment
1. Build the project: `npm run build`
2. Upload `dist` folder to your web server
3. Configure server for SPA routing

## 🤝 Contributing

### Development Guidelines
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages

### Testing
- Test wallet connections thoroughly
- Verify smart contract interactions
- Test responsive design on multiple devices
- Validate form inputs and error handling

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Platform Documentation](docs/)
- [API Reference](docs/api.md)
- [Smart Contract Documentation](docs/contracts.md)

### Community
- **Discord**: [Join our Discord server](https://discord.gg/squdy)
- **Telegram**: [@SqudyOfficial](https://t.me/SqudyOfficial)
- **Twitter**: [@SqudyOfficial](https://twitter.com/SqudyOfficial)
- **Medium**: [Squdy Blog](https://medium.com/@squdy)

### Contact
- **Email**: support@squdy.com
- **Website**: https://squdy.com

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Basic platform functionality
- ✅ Campaign creation and management
- ✅ User staking interface
- ✅ Social media integration

### Phase 2 (Q2 2024)
- 🔄 Advanced analytics dashboard
- 🔄 Mobile app development
- 🔄 Multi-chain support
- 🔄 NFT marketplace integration

### Phase 3 (Q3 2024)
- 📋 DAO governance implementation
- 📋 Advanced reward mechanisms
- 📋 Cross-chain campaigns
- 📋 DeFi protocol integrations

### Phase 4 (Q4 2024)
- 📋 Layer 2 scaling solutions
- 📋 Advanced social features
- 📋 Gamification elements
- 📋 Enterprise partnerships

---

**Built with ❤️ by the Squdy Team**

*Revolutionizing the intersection of DeFi, social engagement, and token economics.*
