# PodShare Product Requirements

This document supersedes the rough assumptions from the initial technical spec and reflects the clarified product direction.

## Product Summary

PodShare is a subscription-sharing platform with two major modes:

1. `Managed subscription sharing`
   Users create shared subscription groups ("pods"), invite friends or allow public discovery, collect split payments through the platform, and rely on the platform to manage the upstream service payment.

2. `Subscription tracking`
   Users can also link or manually track existing subscriptions to understand how much they spend monthly and how much they save by sharing through PodShare.

## Core User Value

Users should be able to:

- sign up and create an account
- add friends and invite them into shared subscriptions
- create a subscription share for services like ChatGPT, Spotify, Adobe, or Netflix
- choose whether a share is `private` or `public`
- accept payments from members using each member's preferred payment method
- see a social feed of public pods/shares
- request to join public shares
- keep private shares hidden unless explicitly invited
- track their current subscriptions and total monthly subscription spend
- see how much money they save by using PodShare

## Primary Product Areas

### 1. Accounts and Profiles

Users need:

- account creation and sign-in
- profile management
- trusted identity within the app
- friend graph or friend connections

### 2. Friends and Invites

Users need:

- ability to add friends
- search/invite flow
- invite acceptance
- friend list management
- pod invites tied to friendships or direct invitations

### 3. Shared Subscription Pods

Each pod represents a shared subscription arrangement.

Pods need:

- subscription type or custom service name
- pod owner/leader
- max member count
- split cost per member
- visibility: `public` or `private`
- member list and statuses
- invite flow
- join request flow
- approval flow for public/private access where needed
- shared service username/password or credentials storage

### 4. Public Feed

The app should include a feed or discovery page where:

- public shares are visible
- friends can discover shares
- users can request to join
- share metadata is visible without exposing sensitive credentials

The feed should show:

- service name
- pod title
- owner display name
- member count
- available slots
- monthly split cost
- join/request action

### 5. Private Pods

Private pods should:

- not appear in the public feed
- not be joinable by outsiders unless invited
- only be visible to members/invitees

### 6. Payments

Members should:

- add their preferred payment method
- pay their split amount through the platform
- see payment history and current dues

The platform flow is:

- member payments are collected by PodShare
- PodShare then pays the upstream subscription/service
- access is managed through the pod credentials

This means the system needs:

- member billing tracking
- payment status tracking
- owner/platform payment tracking
- failure handling
- refund/dispute readiness

### 7. Subscription Tracking Page

Users need a dedicated page where they can:

- view all subscriptions they are part of
- see personal subscriptions and shared subscriptions together
- link or manually add existing subscriptions
- monitor monthly subscription spending
- manage tracked subscriptions
- see how much they save through shared pods

This page should support:

- active subscriptions
- monthly total spend
- shared subscription spend
- savings versus paying solo
- manual or connected subscription entries

## Recommended Data Model Additions

The original MVP schema is not enough for the clarified product.

New concepts that should be added:

- `Friendship`
- `FriendRequest`
- `PodInvite`
- `TrackedSubscription`
- `PodVisibility` or equivalent explicit visibility semantics
- `JoinRequest` if not modeled through membership state alone
- `PaymentMethodReference`
- `PlatformBillingRecord` or equivalent owner/platform payment tracking
- `SavingsSnapshot` or computed savings fields

## Security-Sensitive Areas

The following areas need extra care:

- service username/password storage
- payment method handling
- platform-managed subscription payments
- access revocation when members fail to pay
- visibility rules for private pods

## Product Questions To Resolve Later

Some issues are product/legal/business decisions rather than implementation details:

- whether friend relationships are one-way invites or mutual connections
- whether public feed visibility is limited to friends, school community, or all users
- whether the platform pays subscriptions automatically or only tracks and assists
- whether every service allows this model under its terms
- whether platform-held credentials are always required or optional

## Immediate Engineering Implication

The next implementation passes should be built toward:

1. auth and profile foundation
2. friend/invite system
3. subscription tracker page
4. public feed and private/public pod visibility
5. pod membership and join flows
6. payment method and billing infrastructure
