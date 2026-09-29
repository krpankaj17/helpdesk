package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreatePriorityRequest;
import com.datansh.HelpDesk.dto.PriorityResponse;
import com.datansh.HelpDesk.entity.Priority;
import com.datansh.HelpDesk.repository.PriorityRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class PriorityService {
    private final PriorityRepository repository;
    public PriorityService(PriorityRepository repository){
        this.repository = repository;
    }
    public Page<PriorityResponse> getAllPriority(Pageable pageable){
       return repository.findAll(pageable).map(this::mapToResponse);
    }
    public PriorityResponse createPriority(CreatePriorityRequest request) {
        Priority priority = Priority.builder()
                .name(request.name())
                .description(request.description()).build();
        Priority savedPriority = repository.save(priority);
        return mapToResponse(savedPriority);
    }
    public PriorityResponse mapToResponse(Priority priority){
        return new PriorityResponse(priority.getPriorityId(), priority.getName(), priority.getDescription());
    }

}
