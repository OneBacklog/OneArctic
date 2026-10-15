<template>
  <div>
    <NuxtLoadingIndicator color="var(--nord-aurora)" />
    <ClientOnly>
      <NuxtRouteAnnouncer />
    </ClientOnly>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
