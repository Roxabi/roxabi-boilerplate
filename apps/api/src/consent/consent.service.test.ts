import { Test, type TestingModule } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CONSENT_REPO } from './consent.repository.js'
import { ConsentService, type SaveConsentDto } from './consent.service.js'
import { ConsentNotFoundException } from './exceptions/consentNotFound.exception.js'
import { InMemoryConsentRepository } from './repositories/inMemoryConsent.repository.js'

describe('ConsentService (with InMemoryConsentRepository)', () => {
  let module: TestingModule
  let service: ConsentService
  let repo: InMemoryConsentRepository

  beforeEach(async () => {
    repo = new InMemoryConsentRepository()
    module = await Test.createTestingModule({
      providers: [ConsentService, { provide: CONSENT_REPO, useValue: repo }],
    }).compile()
    service = module.get(ConsentService)
  })

  afterEach(async () => {
    repo.clear()
    await module.close()
  })

  const validDto: SaveConsentDto = {
    categories: { necessary: true, analytics: true, marketing: false },
    policyVersion: '2026-02-v1',
    action: 'customized',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  }

  describe('saveConsent', () => {
    it('should persist and return a mapped ConsentRecord', async () => {
      // Arrange
      // (validDto + 'user-1' defined above)

      // Act
      const result = await service.saveConsent('user-1', validDto)

      // Assert
      expect(result.userId).toBe('user-1')
      expect(result.categories).toEqual(validDto.categories)
      expect(result.policyVersion).toBe('2026-02-v1')
      expect(result.action).toBe('customized')
      expect(result.id).toBeTruthy()
      expect(result.createdAt).toBeTruthy()
    })

    it('should accept optional ipAddress and userAgent without error', async () => {
      const result = await service.saveConsent('user-1', validDto)

      expect(result.userId).toBe('user-1')
    })
  })

  describe('getLatestConsent', () => {
    it('should return the most recent record after multiple saves', async () => {
      // Arrange
      await service.saveConsent('user-1', { ...validDto, policyVersion: '2026-01-v1' })
      await service.saveConsent('user-1', { ...validDto, policyVersion: '2026-02-v1' })

      // Act
      const result = await service.getLatestConsent('user-1')

      // Assert
      expect(result.policyVersion).toBe('2026-02-v1')
    })

    it('should throw ConsentNotFoundException when no record exists', async () => {
      // Arrange
      // (no records saved for 'nonexistent-user')

      // Act & Assert
      await expect(service.getLatestConsent('nonexistent-user')).rejects.toThrow(
        ConsentNotFoundException
      )
    })
  })
})
