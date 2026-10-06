package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreateSlaPolicyRequest;
import com.datansh.HelpDesk.dto.SlaPolicyResponse;
import com.datansh.HelpDesk.dto.UpdateSlaPolicyRequest;
import com.datansh.HelpDesk.entity.Priority;
import com.datansh.HelpDesk.entity.SlaPolicy;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.PriorityRepository;
import com.datansh.HelpDesk.repository.SlaPolicyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
public class SlaPolicyService {
    private static final Logger log = LoggerFactory.getLogger(SlaPolicyService.class);

    private final SlaPolicyRepository slaPolicyRepository;
    private final PriorityRepository priorityRepository;

    public SlaPolicyService(SlaPolicyRepository slaPolicyRepository,
                            PriorityRepository priorityRepository) {
        this.slaPolicyRepository = slaPolicyRepository;
        this.priorityRepository = priorityRepository;
    }

    public List<SlaPolicyResponse> getAllPolicies() {
        return slaPolicyRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public SlaPolicyResponse getPolicyById(Long id) {
        SlaPolicy policy = slaPolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SlaPolicy", "id", id));
        return mapToResponse(policy);
    }

    public SlaPolicyResponse getPolicyByPriorityId(Long priorityId) {
        Priority priority = priorityRepository.findById(priorityId)
                .orElseThrow(() -> new ResourceNotFoundException("Priority", "id", priorityId));

        SlaPolicy policy = slaPolicyRepository.findByPriorityId(priority)
                .orElseThrow(() -> new ResourceNotFoundException("SlaPolicy", "priorityId", priorityId));
        return mapToResponse(policy);
    }

    public SlaPolicyResponse createPolicy(CreateSlaPolicyRequest request) {
        Priority priority = priorityRepository.findById(request.priorityId())
                .orElseThrow(() -> new ResourceNotFoundException("Priority", "id", request.priorityId()));

        if (slaPolicyRepository.existsByPriorityId(priority)) {
            throw new IllegalArgumentException("An SLA policy already exists for priority: " + priority.getName());
        }

        SlaPolicy policy = SlaPolicy.builder()
                .priorityId(priority)
                .description(request.description())
                .responseTime(Duration.ofMinutes(request.responseTimeMinutes()))
                .resolutionTime(Duration.ofMinutes(request.resolutionTimeMinutes()))
                .build();

        SlaPolicy saved = slaPolicyRepository.save(policy);
        log.info("SLA policy created for priority: " + priority.getName() + " with id: " + saved.getPolicyId());
        return mapToResponse(saved);
    }

    public SlaPolicyResponse updatePolicy(Long id, UpdateSlaPolicyRequest request) {
        SlaPolicy policy = slaPolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SlaPolicy", "id", id));

        if (request.priorityId() != null) {
            Priority newPriority = priorityRepository.findById(request.priorityId())
                    .orElseThrow(() -> new ResourceNotFoundException("Priority", "id", request.priorityId()));

            if (slaPolicyRepository.existsByPriorityIdAndPolicyIdNot(newPriority, id)) {
                throw new IllegalArgumentException("An SLA policy already exists for priority: " + newPriority.getName());
            }
            policy.setPriorityId(newPriority);
        }

        if (request.description() != null) {
            policy.setDescription(request.description());
        }

        if (request.responseTimeMinutes() != null) {
            policy.setResponseTime(Duration.ofMinutes(request.responseTimeMinutes()));
        }

        if (request.resolutionTimeMinutes() != null) {
            policy.setResolutionTime(Duration.ofMinutes(request.resolutionTimeMinutes()));
        }

        SlaPolicy updated = slaPolicyRepository.save(policy);
        log.info("SLA policy updated for id: " + id);
        return mapToResponse(updated);
    }

    public void deletePolicy(Long id) {
        SlaPolicy policy = slaPolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SlaPolicy", "id", id));
        slaPolicyRepository.delete(policy);
        log.info("SLA policy deleted with id: " + id);
    }

    public SlaPolicyResponse mapToResponse(SlaPolicy policy) {
        return new SlaPolicyResponse(
                policy.getPolicyId(),
                policy.getPriorityId() != null ? policy.getPriorityId().getPriorityId() : null,
                policy.getPriorityId() != null ? policy.getPriorityId().getName() : null,
                policy.getDescription(),
                policy.getResponseTime() != null ? policy.getResponseTime().toMinutes() : null,
                policy.getResolutionTime() != null ? policy.getResolutionTime().toMinutes() : null
        );
    }
}
